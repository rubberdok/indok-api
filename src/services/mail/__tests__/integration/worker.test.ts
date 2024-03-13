import { fail } from "node:assert";
import { faker } from "@faker-js/faker";
import { jest } from "@jest/globals";
import { QueueEvents, UnrecoverableError } from "bullmq";
import { Redis } from "ioredis";
import { type DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import { env } from "~/config.js";
import type { Booking } from "~/domain/cabins.js";
import { InternalServerError, NotFoundError } from "~/domain/errors.js";
import type { User } from "~/domain/users.js";
import { Queue } from "~/lib/bullmq/queue.js";
import { Worker } from "~/lib/bullmq/worker.js";
import type { MailService } from "../../index.js";
import {
	type CabinService,
	type EmailQueueType,
	type EmailWorkerType,
	type EventService,
	type UserService,
	getEmailHandler,
} from "../../worker.js";

describe("MailService", () => {
	let mailWorker: EmailWorkerType;
	let mailQueue: EmailQueueType;
	let redis: Redis;
	let mockUserService: DeepMockProxy<UserService>;
	let mockMailService: DeepMockProxy<MailService>;
	let mockEventService: DeepMockProxy<EventService>;
	let mockCabinService: DeepMockProxy<CabinService>;
	let eventsRedis: Redis;
	let queueEvents: QueueEvents;

	beforeAll(async () => {
		const queueName = faker.string.uuid();
		mockUserService = mockDeep<UserService>();
		mockMailService = mockDeep<MailService>();
		mockEventService = mockDeep<EventService>();
		mockCabinService = mockDeep<CabinService>();
		redis = new Redis(env.REDIS_CONNECTION_STRING, {
			keepAlive: 1_000 * 60 * 3, // 3 minutes
			maxRetriesPerRequest: 0,
		});
		// Queue events use blocking connection, so we need a separate connection
		eventsRedis = new Redis(env.REDIS_CONNECTION_STRING, {
			keepAlive: 1_000 * 60 * 3, // 3 minutes
			maxRetriesPerRequest: 0,
		});

		const { handler } = getEmailHandler({
			mailService: mockMailService,
			userService: mockUserService,
			eventService: mockEventService,
			cabinService: mockCabinService,
		});
		mailWorker = new Worker(queueName, handler, {
			connection: redis,
		});
		mailQueue = new Queue(queueName, {
			connection: redis,
		});
		queueEvents = new QueueEvents(queueName, {
			connection: eventsRedis,
		});

		await mailQueue.waitUntilReady();
		await mailWorker.waitUntilReady();
		await queueEvents.waitUntilReady();
	});

	afterAll(async () => {
		await mailWorker.close(true);
		await mailQueue.close();
		await queueEvents.close();
		redis.disconnect();
		eventsRedis.disconnect();
	});

	beforeEach(() => {
		mailWorker.removeAllListeners();
		jest.clearAllMocks();
	});

	describe("worker", () => {
		describe("type: user-registration", () => {
			it("should send a welcome email to the user", async () => {
				mockUserService.get.mockResolvedValue(
					mock<User>({
						id: faker.string.uuid(),
						email: faker.internet.email(),
					}),
				);
				mockMailService.send.mockResolvedValue();

				const job = await mailQueue.add("send-email", {
					type: "user-registration",
					recipientId: faker.string.uuid(),
				});

				const result = await job.waitUntilFinished(queueEvents, 7_500);

				expect(result.ok).toBe(true);
				expect(mockMailService.send).toHaveBeenCalled();
			}, 10_000);
		});

		describe("type: cabin-booking-receipt", () => {
			it("should throw UnrecoverableError if the booking does not exist", async () => {
				mockCabinService.getBooking.mockResolvedValue({
					ok: false,
					error: new NotFoundError("Booking does not exist"),
				});

				const job = await mailQueue.add("send-email", {
					type: "cabin-booking-receipt",
					bookingId: faker.string.uuid(),
				});

				mailWorker.on("failed", (_job, error) => {
					expect(error).toBeInstanceOf(UnrecoverableError);
				});

				try {
					await job.waitUntilFinished(queueEvents, 7_500);
					fail("Expected job to fail");
				} catch {
					const state = await job.getState();
					expect(state).toBe("failed");
				}
			}, 10_000);

			it("should throw InternalServerError if something goes wrong with fetching the booking", async () => {
				mockCabinService.getBooking.mockResolvedValue({
					ok: false,
					error: new InternalServerError("Internal Server Error"),
				});

				const job = await mailQueue.add("send-email", {
					type: "cabin-booking-receipt",
					bookingId: faker.string.uuid(),
				});

				mailWorker.on("failed", (_job, error) => {
					expect(error).toBeInstanceOf(InternalServerError);
				});

				try {
					await job.waitUntilFinished(queueEvents, 7_500);
					fail("Expected job to fail");
				} catch {
					const state = await job.getState();
					expect(state).toBe("failed");
				}
			}, 10_000);

			it("should send a cabin booking receipt to the email", async () => {
				const booking = mock<Booking>({
					email: "test@example.com",
					id: faker.string.uuid(),
				});
				mockCabinService.getBooking.mockResolvedValueOnce({
					ok: true,
					data: {
						booking,
					},
				});
				mockMailService.send.mockResolvedValue();

				const job = await mailQueue.add("send-email", {
					type: "cabin-booking-receipt",
					bookingId: faker.string.uuid(),
				});

				const result = await job.waitUntilFinished(queueEvents, 7_500);

				expect(result.ok).toBe(true);
				expect(mockMailService.send).toHaveBeenCalledWith(
					expect.objectContaining({
						to: "test@example.com",
					}),
				);
			});
		});
	});
});

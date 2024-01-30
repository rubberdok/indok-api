import { faker } from "@faker-js/faker";
import { QueueEvents } from "bullmq";
import { Redis } from "ioredis";
import { type DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import { env } from "~/config.js";
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

	beforeAll(() => {
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
		mailWorker = new Worker("email", handler, {
			connection: redis,
		});
		mailQueue = new Queue("email", {
			connection: redis,
		});
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

				await job.waitUntilFinished(
					new QueueEvents("mail", {
						connection: eventsRedis,
					}),
					10_0000,
				);

				expect(mockMailService.send).toHaveBeenCalled();
			}, 10_000);
		});
	});

	afterAll(async () => {
		await mailWorker.close();
		await mailQueue.close();
		await redis.quit();
		await eventsRedis.quit();
	});
});

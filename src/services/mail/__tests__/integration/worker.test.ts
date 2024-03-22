import { fail } from "node:assert";
import { faker } from "@faker-js/faker";
import { jest } from "@jest/globals";
import { QueueEvents, UnrecoverableError } from "bullmq";
import { Redis } from "ioredis";
import { type DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import { DateTime } from "luxon";
import { env } from "~/config.js";
import { type Booking, BookingTerms } from "~/domain/cabins.js";
import {
	DownstreamServiceError,
	InternalServerError,
	NotFoundError,
} from "~/domain/errors.js";
import type { EventType } from "~/domain/events/event.js";
import type { OrderType, ProductType } from "~/domain/products.js";
import type { User } from "~/domain/users.js";
import { Queue } from "~/lib/bullmq/queue.js";
import { Worker } from "~/lib/bullmq/worker.js";
import { Result } from "~/lib/result.js";
import type { MailService } from "../../index.js";
import {
	type CabinService,
	type EmailQueueType,
	type EmailWorkerType,
	type EventService,
	type FileService,
	type ProductService,
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
	let mockProductService: DeepMockProxy<ProductService>;
	let mockFileService: DeepMockProxy<FileService>;
	let eventsRedis: Redis;
	let queueEvents: QueueEvents;

	beforeAll(async () => {
		const queueName = faker.string.uuid();
		mockUserService = mockDeep<UserService>();
		mockMailService = mockDeep<MailService>();
		mockEventService = mockDeep<EventService>();
		mockCabinService = mockDeep<CabinService>();
		mockProductService = mockDeep<ProductService>();
		mockFileService = mockDeep<FileService>();
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
			productService: mockProductService,
			fileService: mockFileService,
			logger: mock(),
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

		describe("type: event-wait-list-confrimation", () => {
			it("should send a notification to the user", async () => {
				const user = {
					...mock<User>(),
					id: faker.string.uuid(),
					email: faker.internet.email(),
				};
				const event = {
					...mock<EventType>(),
					id: faker.string.uuid(),
					name: faker.lorem.words(3),
					startAt: DateTime.fromObject(
						{
							year: 2077,
							day: 1,
							month: 1,
							hour: 12,
							minute: 0,
							second: 0,
						},
						{ zone: "Europe/Oslo" },
					).toJSDate(),
					location: faker.location.streetAddress(),
				};
				mockUserService.get.mockResolvedValue(user);
				mockMailService.send.mockResolvedValue();
				mockEventService.get.mockResolvedValue(event);

				const job = await mailQueue.add("send-email", {
					type: "event-wait-list-confirmation",
					eventId: faker.string.uuid(),
					recipientId: faker.string.uuid(),
				});

				await job.waitUntilFinished(queueEvents, 10_0000);

				expect(mockMailService.send).toHaveBeenCalledWith(
					expect.objectContaining({
						to: user.email,
						templateAlias: "event-wait-list",
						content: expect.objectContaining({
							event: {
								name: event.name,
								location: event.location,
								startAt: "fredag 1. januar 2077 kl. 12:00",
							},
							actionUrl: `${env.CLIENT_URL}/events/${event.id}`,
						}),
					}),
				);
			}, 10_000);
		});

		describe("type: order-receipt", () => {
			it("should send a receipt to the user", async () => {
				const order: OrderType = {
					...mock<OrderType>(),
					id: faker.string.uuid(),
					capturedPaymentAttemptReference: faker.string.uuid(),
					purchasedAt: DateTime.fromObject(
						{
							year: 2077,
							day: 1,
							month: 1,
							hour: 12,
							minute: 0,
							second: 0,
						},
						{ zone: "Europe/Oslo" },
					).toJSDate(),
					productId: faker.string.uuid(),
					totalPrice: faker.number.int(),
				};
				const product: ProductType = {
					...mock<ProductType>(),
					id: faker.string.uuid(),
					name: faker.lorem.words(3),
				};
				const user: User = {
					...mock<User>(),
					id: faker.string.uuid(),
					firstName: faker.person.firstName(),
					email: faker.internet.exampleEmail(),
				};
				mockProductService.orders.get.mockResolvedValue({
					ok: true,
					data: { order },
				});
				mockProductService.products.get.mockResolvedValue({
					ok: true,
					data: { product },
				});
				mockUserService.get.mockResolvedValue(user);
				mockMailService.send.mockResolvedValue();

				const job = await mailQueue.add("send-email", {
					type: "order-receipt",
					userId: user.id,
					orderId: order.id,
				});

				await job.waitUntilFinished(queueEvents, 10_0000);

				expect(mockMailService.send).toHaveBeenCalledWith(
					expect.objectContaining({
						to: user.email,
						templateAlias: "order-receipt",
						content: expect.objectContaining({
							order: expect.objectContaining({
								id: order.id,
								totalPrice: order.totalPrice,
								purchasedAt: "fredag 1. januar 2077 kl. 12:00",
							}),
							product: expect.objectContaining({
								name: product.name,
							}),
							user: expect.objectContaining({
								firstName: user.firstName,
							}),
							actionUrl: `${env.CLIENT_URL}/profile/orders/${order.id}?reference=${order.capturedPaymentAttemptReference}`,
						}),
					}),
				);
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

			it("should throw error if unable to fetch booking terms", async () => {
				mockCabinService.getBooking.mockResolvedValue(
					Result.success({
						booking: mock<Booking>({
							email: faker.internet.email(),
							id: faker.string.uuid(),
						}),
					}),
				);

				mockCabinService.getBookingTerms.mockResolvedValue({
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

			it("should throw error if download to blob fails", async () => {
				mockCabinService.getBooking.mockResolvedValue(
					Result.success({
						booking: mock<Booking>({
							email: faker.internet.email(),
							id: faker.string.uuid(),
						}),
					}),
				);
				mockCabinService.getBookingTerms.mockResolvedValue(
					Result.success({
						bookingTerms: new BookingTerms({
							id: faker.string.uuid(),
							fileId: faker.string.uuid(),
							createdAt: new Date(),
						}),
					}),
				);
				mockFileService.downloadFileToBuffer.mockResolvedValue(
					Result.error(new DownstreamServiceError("")),
				);

				const job = await mailQueue.add("send-email", {
					type: "cabin-booking-receipt",
					bookingId: faker.string.uuid(),
				});

				mailWorker.on("failed", (_job, error) => {
					expect(error).toBeInstanceOf(DownstreamServiceError);
				});

				try {
					await job.waitUntilFinished(queueEvents, 7_500);
					fail("Expected job to fail");
				} catch {
					const state = await job.getState();
					expect(state).toBe("failed");
				}
			}, 10_000);

			it("should send a cabin booking receipt to the email with booking terms as attachment", async () => {
				const booking = mock<Booking>({
					email: "test@example.com",
					id: faker.string.uuid(),
				});
				const fileBuffer = Buffer.from("test");
				const bookingTerms = new BookingTerms({
					id: faker.string.uuid(),
					fileId: faker.string.uuid(),
					createdAt: new Date(),
				});
				mockCabinService.getBooking.mockResolvedValueOnce({
					ok: true,
					data: {
						booking,
					},
				});
				mockCabinService.getBookingTerms.mockResolvedValueOnce(
					Result.success({
						bookingTerms,
					}),
				);
				mockFileService.downloadFileToBuffer.mockResolvedValueOnce(
					Result.success({
						buffer: fileBuffer,
					}),
				);
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
					expect.arrayContaining([
						expect.objectContaining({
							name: "Bestillingsvilkår.pdf",
							content: fileBuffer.toString("base64"),
							contentType: "application/pdf",
							contentId: bookingTerms.fileId,
						}),
					]),
				);
			});
		});
	});
});

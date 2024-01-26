import { faker } from "@faker-js/faker";
import { QueueEvents } from "bullmq";
import { Redis } from "ioredis";
import { type DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import { pino } from "pino";
import type { MessageSendingResponse } from "postmark/dist/client/models/index.js";
import { env } from "~/config.js";
import type { User } from "~/domain/users.js";
import { envToLogger } from "~/lib/fastify/logging.js";
import { Queue } from "~/lib/mq.js";
import type { MailService } from "../../index.js";
import {
	type EmailQueueType,
	EmailWorker,
	type EmailWorkerType,
	type UserService,
} from "../../worker.js";

describe("MailService", () => {
	let mailWorker: EmailWorkerType;
	let mailQueue: EmailQueueType;
	let redis: Redis;
	let mockUserService: DeepMockProxy<UserService>;
	let mockMailService: DeepMockProxy<MailService>;
	let eventsRedis: Redis;

	beforeAll(() => {
		mockUserService = mockDeep<UserService>();
		mockMailService = mockDeep<MailService>();
		redis = new Redis(env.REDIS_CONNECTION_STRING, {
			keepAlive: 1_000 * 60 * 3, // 3 minutes
			maxRetriesPerRequest: 0,
		});
		// Queue events use blocking connection, so we need a separate connection
		eventsRedis = new Redis(env.REDIS_CONNECTION_STRING, {
			keepAlive: 1_000 * 60 * 3, // 3 minutes
			maxRetriesPerRequest: 0,
		});

		mailWorker = EmailWorker({
			mailService: mockMailService,
			userService: mockUserService,
			redisClient: redis,
			log: pino(envToLogger[env.NODE_ENV]),
		});

		mailQueue = new Queue("email", {
			connection: redis,
		});
	});

	describe("worker", () => {
		describe("#welcome", () => {
			it("should send a welcome email to the user", async () => {
				mockUserService.get.mockResolvedValue(
					mock<User>({
						id: faker.string.uuid(),
						email: faker.internet.email(),
					}),
				);
				mockMailService.send.mockResolvedValue(
					mockDeep<MessageSendingResponse>(),
				);

				const job = await mailQueue.add("welcome", {
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

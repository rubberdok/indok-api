import { faker } from "@faker-js/faker";
import { QueueEvents } from "bullmq";
import { Redis } from "ioredis";
import { mock, mockDeep } from "jest-mock-extended";
import { env } from "~/config.js";
import { Queue } from "~/lib/bullmq/queue.js";
import { Worker } from "~/lib/bullmq/worker.js";
import type { EmailClient } from "~/lib/postmark.js";
import prisma from "~/lib/prisma.js";
import { ProductRepository } from "~/repositories/products/repository.js";
import { UserRepository } from "~/repositories/users/index.js";
import { buildMailService } from "~/services/mail/index.js";
import {
	type EmailQueueType,
	type EmailWorkerType,
	getEmailHandler,
} from "~/services/mail/worker.js";
import { UserService } from "~/services/users/service.js";
import { ProductService, type ProductServiceType } from "../../service.js";
import {
	type PaymentProcessingQueueType,
	type PaymentProcessingWorkerType,
	getPaymentProcessingHandler,
} from "../../worker.js";
import { MockVippsClientFactory } from "../mock-vipps-client.js";

export async function makeDependencies(overrides?: {
	productService?: ProductServiceType;
}) {
	const paymentQueueName = faker.string.uuid();
	const productRepository = new ProductRepository(prisma);
	const { client, factory } = MockVippsClientFactory();
	const redis = new Redis(env.REDIS_CONNECTION_STRING, {
		maxRetriesPerRequest: null,
	});
	const paymentProcessingQueue: PaymentProcessingQueueType = new Queue(
		paymentQueueName,
		{
			connection: redis,
		},
	);
	const emailQueueName = faker.string.uuid();
	const emailQueue: EmailQueueType = new Queue(emailQueueName, {
		connection: redis,
	});
	const emailClient = mockDeep<EmailClient>();

	const mailService = buildMailService(
		{
			emailQueue,
			emailClient,
		},
		{
			companyName: "Test Company",
			contactMail: faker.internet.exampleEmail(),
			noReplyEmail: faker.internet.exampleEmail(),
			parentCompany: "Test Parent Company",
			productName: "Test Product",
			websiteUrl: "https://example.com",
		},
	);

	const productService =
		overrides?.productService ??
		ProductService({
			mailService,
			vippsFactory: factory,
			paymentProcessingQueue,
			productRepository,
			config: {
				useTestMode: true,
				returnUrl: env.SERVER_URL,
			},
		});
	const userRepository = new UserRepository(prisma);
	const userService = new UserService(userRepository, mailService);

	const { handler } = getPaymentProcessingHandler({
		productService,
		log: mockDeep(),
	});

	const worker: PaymentProcessingWorkerType = new Worker(
		paymentQueueName,
		handler,
		{
			connection: redis,
		},
	);
	const emailHandler = getEmailHandler({
		mailService,
		cabinService: mockDeep(),
		eventService: mockDeep(),
		productService,
		userService,
		logger: mock(),
		fileService: mock(),
	});
	const emailWorker: EmailWorkerType = new Worker(
		emailQueueName,
		emailHandler.handler,
		{
			connection: redis,
		},
	);
	const emailQueueEventsRedis = new Redis(env.REDIS_CONNECTION_STRING, {
		maxRetriesPerRequest: null,
	});
	const emailQueueEvents = new QueueEvents(emailQueueName, {
		connection: emailQueueEventsRedis,
	});

	const queueEventsRedis = new Redis(env.REDIS_CONNECTION_STRING, {
		maxRetriesPerRequest: null,
	});

	const queueEvents = new QueueEvents(paymentQueueName, {
		connection: queueEventsRedis,
	});

	const close = async () => {
		await emailQueueEvents.close();
		await paymentProcessingQueue.close();
		await emailQueue.close();
		await emailWorker.close(true);
		await worker.close(true);
		await queueEvents.close();
		queueEventsRedis.disconnect();
		emailQueueEventsRedis.disconnect();
		redis.disconnect();
	};

	await worker.waitUntilReady();
	await emailWorker.waitUntilReady();
	await queueEvents.waitUntilReady();
	await paymentProcessingQueue.waitUntilReady();

	return {
		productService,
		close,
		vippsMock: client,
		queueEvents,
		paymentProcessingQueue,
		worker,
		paymentQueueName,
		emailClient,
		emailQueue,
		emailQueueName,
		emailQueueEvents,
	};
}

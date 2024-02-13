import { faker } from "@faker-js/faker";
import { QueueEvents } from "bullmq";
import { Redis } from "ioredis";
import { pino } from "pino";
import { env } from "~/config.js";
import { Queue } from "~/lib/bullmq/queue.js";
import { Worker } from "~/lib/bullmq/worker.js";
import { envToLogger } from "~/lib/fastify/logging.js";
import prisma from "~/lib/prisma.js";
import { ProductRepository } from "~/repositories/products/repository.js";
import { ProductService, type ProductServiceType } from "../../service.js";
import {
	type PaymentProcessingQueueType,
	type PaymentProcessingWorkerType,
	getPaymentProcessingHandler,
} from "../../worker.js";
import { MockVippsClientFactory } from "../mock-vipps-client.js";

export function makeDependencies(overrides?: {
	productService?: ProductServiceType;
}) {
	const queueName = faker.string.uuid();
	const productRepository = new ProductRepository(prisma);
	const { client, factory } = MockVippsClientFactory();
	const redis = new Redis(env.REDIS_CONNECTION_STRING, {
		maxRetriesPerRequest: null,
	});
	const paymentProcessingQueue: PaymentProcessingQueueType = new Queue(
		queueName,
		{
			connection: redis,
		},
	);

	const productService =
		overrides?.productService ??
		ProductService({
			vippsFactory: factory,
			paymentProcessingQueue,
			productRepository,
			config: {
				useTestMode: true,
				returnUrl: env.SERVER_URL,
			},
		});

	const { handler } = getPaymentProcessingHandler({
		productService,
		log: pino(envToLogger.test),
	});

	const worker: PaymentProcessingWorkerType = new Worker(queueName, handler, {
		connection: redis,
	});

	const queueEventsRedis = new Redis(env.REDIS_CONNECTION_STRING, {
		maxRetriesPerRequest: null,
	});

	const queueEvents = new QueueEvents(queueName, {
		connection: queueEventsRedis,
	});

	const close = async () => {
		await paymentProcessingQueue.close();
		await worker.close();
		await queueEvents.close();
		queueEventsRedis.disconnect();
		redis.disconnect();
	};

	return {
		productService,
		close,
		vippsMock: client,
		queueEvents,
		paymentProcessingQueue,
		worker,
		queueName,
	};
}

import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import type { Redis } from "ioredis";
import { InternalServerError } from "~/domain/errors.js";
import {
	SignUpQueueName,
	type SignUpQueueType,
} from "~/services/events/worker.js";
import type { EmailQueueType } from "~/services/mail/worker.js";
import type { PaymentProcessingQueueType } from "~/services/products/worker.js";
import { PaymentProcessingQueueName } from "~/services/products/worker.js";
import { Queue } from "../bullmq/queue.js";

type FastifyMessageQueuePluginOptions = {
	name: string;
	connection?: Redis;
};

type KnownQueues = {
	email: EmailQueueType;
	[PaymentProcessingQueueName]: PaymentProcessingQueueType;
	[SignUpQueueName]: SignUpQueueType;
};

declare module "fastify" {
	interface FastifyInstance {
		queues: Partial<KnownQueues & Record<string, Queue>>;
	}
}

const fastifyMessageQueue: FastifyPluginAsync<
	FastifyMessageQueuePluginOptions
	// biome-ignore lint/suspicious/useAwait: We need to use async/await API here
> = async (fastify, opts) => {
	const { connection = fastify.redis["message-queue"], name } = opts;
	if (!connection) {
		throw new InternalServerError("Message queue connection not initialized");
	}

	const queue = new Queue(
		name,
		{
			connection: connection ?? fastify.redis["message-queue"],
		},
		undefined,
		fastify.log.child({ service: `${name}-queue` }),
	);

	fastify.addHook("onClose", async () => {
		await queue.close();
	});

	if (fastify.hasDecorator("queues")) {
		fastify.queues[name] = queue;
	} else {
		fastify.decorate("queues", {
			[name]: queue,
		});
	}
};

export default fp(fastifyMessageQueue);

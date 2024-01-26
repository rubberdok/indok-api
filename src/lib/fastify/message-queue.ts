import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import type { Redis } from "ioredis";
import { InternalServerError } from "~/domain/errors.js";
import type { EmailQueueType } from "~/services/mail/worker.js";
import { Queue } from "../mq.js";

type FastifyMessageQueuePluginOptions = {
	name: string;
	connection?: Redis | undefined;
};

type KnownQueues = {
	email: EmailQueueType;
};

declare module "fastify" {
	interface FastifyInstance {
		queues: Partial<KnownQueues & Record<string, Queue>>;
	}
}

const fastifyMessageQueue: FastifyPluginAsync<
	FastifyMessageQueuePluginOptions
	// biome-ignore lint/nursery/useAwait: We need to use async/await API here
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
		fastify.decorate("queues", {
			...fastify.queues,
			[name]: queue,
		});
	} else {
		fastify.decorate("queues", {
			[name]: queue,
		});
	}
};

export default fp(fastifyMessageQueue);

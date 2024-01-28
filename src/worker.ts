import type { PrismaClient } from "@prisma/client";
import server, { type Avvio, type Plugin } from "avvio";
import type { Processor } from "bullmq";
import { Redis } from "ioredis";
import { type Logger, pino } from "pino";
import { env } from "./config.js";
import { InternalServerError } from "./domain/errors.js";
import { envToLogger } from "./lib/fastify/logging.js";
import { Queue, Worker } from "./lib/mq.js";
import postmark from "./lib/postmark.js";
import prisma from "./lib/prisma.js";
import { MemberRepository } from "./repositories/organizations/members.js";
import { OrganizationRepository } from "./repositories/organizations/organizations.js";
import { UserRepository } from "./repositories/users/index.js";
import { MailService } from "./services/mail/index.js";
import {
	type EmailQueueType,
	getEmailHandler,
} from "./services/mail/worker.js";
import { PermissionService } from "./services/permissions/service.js";
import { UserService } from "./services/users/service.js";

type WorkerType = {
	redis: Redis;
	database: PrismaClient;
	log: Logger;
	// biome-ignore lint/suspicious/noExplicitAny: the types here can be anything
	workers?: Record<string, Worker<any, any, any>>;
	queues?: Partial<{
		email: EmailQueueType;
	}> &
		// biome-ignore lint/suspicious/noExplicitAny: the types here can be anything
		Record<string, Queue<any, any, any>>;
};

const avvioRedis: Plugin<{ url: string }, WorkerType> = (instance, opts) => {
	instance.redis = new Redis(opts.url, {
		keepAlive: 1_000 * 60 * 3, // 3 minutes
		maxRetriesPerRequest: 0,
	});

	instance.redis.on("error", (err) => {
		instance.log?.error(err);
	});

	instance.redis?.on("connect", () => {
		instance.log?.info("Redis connected");
	});

	instance.redis?.on("ready", () => {
		instance.log?.info("Redis ready");
	});

	instance.redis?.on("close", () => {
		instance.log?.info("Redis close");
	});

	instance.redis?.on("reconnecting", () => {
		instance.log?.info("Redis reconnecting");
	});

	instance.onClose(async () => {
		await instance.redis?.quit();
	});

	return Promise.resolve();
};

const avvioWorker: Plugin<
	// biome-ignore lint/suspicious/noExplicitAny: the types here can be anything
	{ name: string; handler: Processor<any, any, any> },
	WorkerType
> = (instance, opts) => {
	const { name, handler } = opts;

	if (instance.workers === undefined) {
		instance.workers = {};
	}

	if (!instance.redis) {
		throw new InternalServerError("Redis not initialized");
	}
	const log = instance.log.child({ worker: name });
	const worker = new Worker(
		name,
		handler,
		{
			connection: instance.redis,
		},
		undefined,
		log,
	);

	instance.workers[worker.name] = worker;
	instance.onClose(async () => {
		await worker.close();
	});
	return Promise.resolve();
};

const avvioQueue: Plugin<{ name: string }, WorkerType> = (instance, opts) => {
	const { name } = opts;
	if (instance.queues === undefined) {
		instance.queues = {};
	}

	const queue = new Queue(
		name,
		{
			connection: instance.redis,
		},
		undefined,
		instance.log.child({ queue: name }),
	);

	instance.queues[name] = queue;

	return Promise.resolve();
};

export async function initWorkers(): Promise<{
	worker: Avvio<WorkerType>;
	close: () => void;
}> {
	const worker = server<WorkerType>({} as unknown as WorkerType);

	worker.use((instance) => {
		instance.log = pino(envToLogger[env.NODE_ENV]);
		return Promise.resolve();
	});

	worker.use((instance) => {
		instance.database = prisma;
		instance.onClose(async () => {
			await instance.database?.$disconnect();
		});
		return Promise.resolve();
	});

	worker.use(avvioRedis, { url: env.REDIS_CONNECTION_STRING });

	worker.use(avvioQueue, { name: "email" });

	worker.use((instance) => {
		const userRepository = new UserRepository(instance.database);
		const memberRepository = new MemberRepository(instance.database);
		const organizationRepository = new OrganizationRepository(
			instance.database,
		);
		const permissionService = new PermissionService(
			memberRepository,
			userRepository,
			organizationRepository,
		);

		if (!instance.queues?.email) {
			throw new InternalServerError("Email queue not initialized");
		}
		const userService = new UserService(
			userRepository,
			permissionService,
			instance.queues?.email,
		);
		const mailService = new MailService(postmark, env.NO_REPLY_EMAIL);

		worker.use(avvioWorker, getEmailHandler({ mailService, userService }));

		return Promise.resolve();
	});

	process.on("SIGINT", () =>
		worker.close((err) => {
			console.error(err);
			process.exit(1);
		}),
	);
	process.on("SIGTERM", () =>
		worker.close((err) => {
			console.error(err);
			process.exit(1);
		}),
	);

	return {
		worker,
		close: async () => {
			worker.close(() => process.exit(1));
		},
	};
}

const { worker } = await initWorkers();

worker.start();

import type { PrismaClient } from "@prisma/client";
import { Client } from "@vippsmobilepay/sdk";
import server, { type Avvio, type Plugin } from "avvio";
import type { Processor } from "bullmq";
import {
	type RedisConnection,
	Worker as BullMqWorker,
	type WorkerOptions,
} from "bullmq";
import { Redis } from "ioredis";
import { type Logger, pino } from "pino";
import { env } from "~/config.js";
import { InternalServerError } from "~/domain/errors.js";
import { EventRepository } from "~/repositories/events/repository.js";
import { MemberRepository } from "~/repositories/organizations/members.js";
import { OrganizationRepository } from "~/repositories/organizations/organizations.js";
import { ProductRepository } from "~/repositories/products/repository.js";
import { UserRepository } from "~/repositories/users/index.js";
import { EventService } from "~/services/events/service.js";
import {
	SignUpQueueName,
	type SignUpQueueType,
	getSignUpWorkerHandler,
} from "~/services/events/worker.js";
import { MailService } from "~/services/mail/index.js";
import {
	type EmailQueueType,
	getEmailHandler,
} from "~/services/mail/worker.js";
import { PermissionService } from "~/services/permissions/service.js";
import {
	ProductService,
	getPaymentProcessingHandler,
} from "~/services/products/index.js";
import {
	PaymentProcessingQueueName,
	type PaymentProcessingQueueType,
} from "~/services/products/worker.js";
import { UserService } from "~/services/users/service.js";
import { envToLogger } from "../fastify/logging.js";
import { postmark } from "../postmark.js";
import prisma from "../prisma.js";
import { Queue } from "./queue.js";

export class Worker<
	// biome-ignore lint/suspicious/noExplicitAny: DataType can be literally anything
	DataType = any,
	// biome-ignore lint/suspicious/noExplicitAny: ResultType can be literally anything
	ResultType = any,
	NameType extends string = string,
> extends BullMqWorker<DataType, ResultType, NameType> {
	constructor(
		name: string,
		processor?: Processor<DataType, ResultType, NameType>,
		opts?: WorkerOptions,
		Connection?: typeof RedisConnection,
		private log?: Logger,
	) {
		super(name, processor, opts, Connection);
		log?.info(`${name} worker created`);

		this.on("ready", () => {
			this.log?.info(`${name} worker listening`);
		});
		this.on("closing", () => {
			this.log?.info(`${name} worker closing`);
		});
		this.on("error", (error) => {
			this.log?.error({ error }, `${name} worker error`);
		});
		this.on("failed", (job, error) => {
			this.log?.error({ error, job }, `${name} job failed`);
		});
		this.on("active", (job) => {
			this.log?.info({ job }, `${name} job started`);
		});
		this.on("completed", (job) => {
			this.log?.info({ job }, `${name} job completed`);
		});
	}
}

type WorkerType = {
	redis: Redis;
	database: PrismaClient;
	log: Logger;
	// biome-ignore lint/suspicious/noExplicitAny: the types here can be anything
	workers?: Record<string, Worker<any, any, any>>;
	queues?: Partial<{
		email: EmailQueueType;
		"payment-processing": PaymentProcessingQueueType;
		[SignUpQueueName]: SignUpQueueType;
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
	close: () => Promise<void>;
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
	worker.use(avvioQueue, { name: PaymentProcessingQueueName });
	worker.use(avvioQueue, { name: SignUpQueueName });

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
		const mailService = new MailService(
			postmark(env.POSTMARK_API_TOKEN, {
				useTestMode: env.NODE_ENV === "test",
			}),
			{
				noReplyEmail: env.NO_REPLY_EMAIL,
				contactMail: env.CONTACT_EMAIL,
				companyName: env.COMPANY_NAME,
				parentCompany: env.PARENT_COMPANY,
				productName: env.PRODUCT_NAME,
				websiteUrl: env.CLIENT_URL,
			},
		);

		if (!instance.queues?.[PaymentProcessingQueueName]) {
			throw new InternalServerError("Payment processing queue not initialized");
		}
		const productRepository = new ProductRepository(instance.database);
		const productService = new ProductService(
			Client,
			instance.queues?.[PaymentProcessingQueueName],
			productRepository,
			{ useTestMode: env.VIPPS_TEST_MODE },
		);

		const eventRepositroy = new EventRepository(instance.database);

		if (!instance.queues?.[SignUpQueueName]) {
			throw new InternalServerError("Sign up queue not initialized");
		}
		const eventService = new EventService(
			eventRepositroy,
			permissionService,
			userService,
			instance.queues?.[SignUpQueueName],
		);

		instance.use(
			avvioWorker,
			getEmailHandler({ mailService, userService, eventService }),
		);
		instance.use(
			avvioWorker,
			getPaymentProcessingHandler({ productService, log: instance.log }),
		);
		instance.use(
			avvioWorker,
			getSignUpWorkerHandler({
				emailQueue: instance.queues?.email,
				events: eventService,
				log: instance.log,
			}),
		);

		return Promise.resolve();
	});

	worker.use(avvioWorker, {
		name: "health-check",
		handler: () => {
			return Promise.resolve(true);
		},
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

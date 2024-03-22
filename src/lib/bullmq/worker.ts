import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import type { PrismaClient } from "@prisma/client";
import { Client } from "@vippsmobilepay/sdk";
import server, { type Avvio, type Plugin } from "avvio";
import {
	Worker as BullMqWorker,
	type Processor,
	type RedisConnection,
	type WorkerOptions,
} from "bullmq";
import { Redis } from "ioredis";
import { type Logger, pino } from "pino";
import { BlobStorageAdapter } from "~/adapters/azure-blob-storage.js";
import { env } from "~/config.js";
import { InternalServerError } from "~/domain/errors.js";
import { CabinRepository } from "~/repositories/cabins/repository.js";
import { EventRepository } from "~/repositories/events/index.js";
import { FileRepository } from "~/repositories/files/repository.js";
import { MemberRepository } from "~/repositories/organizations/members.js";
import { OrganizationRepository } from "~/repositories/organizations/organizations.js";
import { ProductRepository } from "~/repositories/products/repository.js";
import { UserRepository } from "~/repositories/users/index.js";
import { CabinService } from "~/services/cabins/index.js";
import { EventService } from "~/services/events/service.js";
import {
	SignUpQueueName,
	type SignUpQueueType,
	getSignUpWorkerHandler,
} from "~/services/events/worker.js";
import { FileService } from "~/services/files/service.js";
import { buildMailService } from "~/services/mail/index.js";
import {
	type EmailQueueType,
	getEmailHandler,
} from "~/services/mail/worker.js";
import { OrganizationService } from "~/services/organizations/index.js";
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
> = async (instance, opts) => {
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
	await worker.waitUntilReady();
	return Promise.resolve();
};

const avvioQueue: Plugin<{ name: string }, WorkerType> = async (
	instance,
	opts,
) => {
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
	await queue.waitUntilReady();

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
		const cabinRepository = new CabinRepository(instance.database);

		if (!instance.queues?.email) {
			throw new InternalServerError("Email queue not initialized");
		}

		const mailService = buildMailService(
			{
				emailClient: postmark(env.POSTMARK_API_TOKEN, {
					useTestMode: env.NODE_ENV === "test",
				}),
				emailQueue: instance.queues.email,
			},
			{
				noReplyEmail: env.NO_REPLY_EMAIL,
				contactMail: env.CONTACT_EMAIL,
				companyName: env.COMPANY_NAME,
				parentCompany: env.PARENT_COMPANY,
				productName: env.PRODUCT_NAME,
				websiteUrl: env.CLIENT_URL,
			},
		);

		const userService = new UserService(userRepository, mailService);
		const { permissions: permissionService } = OrganizationService({
			memberRepository,
			organizationRepository,
			userService,
		});

		if (!instance.queues?.[PaymentProcessingQueueName]) {
			throw new InternalServerError("Payment processing queue not initialized");
		}
		const productRepository = new ProductRepository(instance.database);
		const productService = ProductService({
			vippsFactory: Client,
			paymentProcessingQueue: instance.queues?.[PaymentProcessingQueueName],
			productRepository,
			mailService,
			config: { useTestMode: env.VIPPS_TEST_MODE, returnUrl: env.SERVER_URL },
		});

		const eventRepositroy = new EventRepository(instance.database);

		if (!instance.queues?.[SignUpQueueName]) {
			throw new InternalServerError("Sign up queue not initialized");
		}
		const eventService = new EventService(
			eventRepositroy,
			permissionService,
			userService,
			productService,
			instance.queues?.[SignUpQueueName],
		);

		const blobServiceClient = new BlobServiceClient(
			`https://${env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
			new DefaultAzureCredential(),
		);
		const blobStorageAdapter = BlobStorageAdapter({
			accountName: env.AZURE_STORAGE_ACCOUNT_NAME,
			containerName: env.AZURE_STORAGE_CONTAINER_NAME,
			blobServiceClient,
		});
		const fileRepository = FileRepository({ db: instance.database });
		const fileService = FileService({ fileRepository, blobStorageAdapter });

		const cabinService = new CabinService(
			cabinRepository,
			mailService,
			permissionService,
			fileService,
		);

		instance.use(
			avvioWorker,
			getEmailHandler({
				mailService,
				userService,
				eventService,
				cabinService,
				fileService,
				productService,
				logger: instance.log,
			}),
		);
		instance.use(
			avvioWorker,
			getPaymentProcessingHandler({ productService, log: instance.log }),
		);
		instance.use(
			avvioWorker,
			getSignUpWorkerHandler({
				mailService,
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

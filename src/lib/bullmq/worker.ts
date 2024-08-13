import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { Client } from "@vippsmobilepay/sdk";
import type { Processor, RedisConnection, WorkerOptions } from "bullmq";
import { Worker as BullMqWorker } from "bullmq";
import { Redis } from "ioredis";
import { type Logger, pino } from "pino";
import { BlobStorageAdapter } from "~/adapters/azure-blob-storage.js";
import { env } from "~/config.js";
import { CabinRepository } from "~/repositories/cabins/repository.js";
import { EventRepository } from "~/repositories/events/repository.js";
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
	type SignUpWorkerType,
	getSignUpWorkerHandler,
} from "~/services/events/worker.js";
import { FileService } from "~/services/files/service.js";
import { buildMailService } from "~/services/mail/index.js";
import {
	EmailQueueName,
	type EmailQueueType,
	type EmailWorkerType,
	getEmailHandler,
} from "~/services/mail/worker.js";
import { OrganizationService } from "~/services/organizations/service.js";
import { ProductService } from "~/services/products/service.js";
import {
	PaymentProcessingQueueName,
	type PaymentProcessingQueueType,
	type PaymentProcessingWorkerType,
	getPaymentProcessingHandler,
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
		log?.debug(`${name} worker created`);

		this.on("ready", () => {
			this.log?.debug(`${name} worker listening`);
		});
		this.on("closing", () => {
			this.log?.debug(`${name} worker closing`);
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

export async function initWorkers(): Promise<{
	start: () => Promise<void>;
	close: (signal?: NodeJS.Signals) => Promise<void>;
}> {
	const logger = pino(envToLogger[env.NODE_ENV]);

	const redis = new Redis(env.REDIS_CONNECTION_STRING, {
		keepAlive: 1_000 * 60 * 3, // 3 minutes
		maxRetriesPerRequest: 0,
	});
	redis.on("error", (err) => {
		logger.error(err);
	});

	redis.on("connect", () => {
		logger.info("Redis connected");
	});

	redis.on("ready", () => {
		logger.info("Redis ready");
	});

	redis.on("close", () => {
		logger.info("Redis close");
	});

	redis.on("reconnecting", () => {
		logger.info("Redis reconnecting");
	});

	const queues: {
		email: EmailQueueType;
		signUp: SignUpQueueType;
		paymentProcessing: PaymentProcessingQueueType;
	} = {
		signUp: new Queue(
			SignUpQueueName,
			{ connection: redis },
			undefined,
			logger.child({ queue: SignUpQueueName }),
		),
		email: new Queue(
			EmailQueueName,
			{ connection: redis },
			undefined,
			logger.child({ queue: EmailQueueName }),
		),
		paymentProcessing: new Queue(
			PaymentProcessingQueueName,
			{ connection: redis },
			undefined,
			logger.child({ queue: PaymentProcessingQueueName }),
		),
	} as const;

	const database = prisma;

	const userRepository = new UserRepository(database);
	const memberRepository = new MemberRepository(database);
	const organizationRepository = new OrganizationRepository(database);
	const cabinRepository = new CabinRepository(database);

	const mailService = buildMailService(
		{
			emailClient: postmark(env.POSTMARK_API_TOKEN, {
				useTestMode: env.NODE_ENV === "test",
			}),
			emailQueue: queues.email,
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
	const productRepository = new ProductRepository(database);
	const productService = ProductService({
		vippsFactory: Client,
		paymentProcessingQueue: queues.paymentProcessing,
		productRepository,
		mailService,
		config: { useTestMode: env.VIPPS_TEST_MODE, returnUrl: env.SERVER_URL },
	});

	const eventRepositroy = new EventRepository(database);

	const eventService = new EventService(
		eventRepositroy,
		permissionService,
		userService,
		productService,
		queues.signUp,
	);

	const blobServiceClient = new BlobServiceClient(
		`https://${env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
		new DefaultAzureCredential({
			managedIdentityClientId: env.AZURE_MANAGED_IDENTITY_CLIENT_ID,
		}),
	);
	const blobStorageAdapter = BlobStorageAdapter({
		accountName: env.AZURE_STORAGE_ACCOUNT_NAME,
		containerName: env.AZURE_STORAGE_CONTAINER_NAME,
		blobServiceClient,
	});
	const fileRepository = FileRepository({ db: database });
	const fileService = FileService({ fileRepository, blobStorageAdapter });

	const cabinService = new CabinService(
		cabinRepository,
		mailService,
		permissionService,
		fileService,
	);

	const emailWorkerHandler = getEmailHandler({
		mailService,
		userService,
		eventService,
		cabinService,
		fileService,
		productService,
		logger,
	});
	const signUpWorkerHandler = getSignUpWorkerHandler({
		events: eventService,
		mailService,
		log: logger,
	});
	const paymentProcessingWorkerHandler = getPaymentProcessingHandler({
		log: logger,
		productService,
	});

	const emailWorker: EmailWorkerType = new Worker(
		emailWorkerHandler.name,
		emailWorkerHandler.handler,
		{ connection: redis },
		undefined,
		logger,
	);

	const signUpWorker: SignUpWorkerType = new Worker(
		signUpWorkerHandler.name,
		signUpWorkerHandler.handler,
		{ connection: redis },
		undefined,
		logger,
	);

	const paymentProcessingWorker: PaymentProcessingWorkerType = new Worker(
		paymentProcessingWorkerHandler.name,
		paymentProcessingWorkerHandler.handler,
		{ connection: redis },
		undefined,
		logger,
	);

	const healthCheckWorker: Worker<boolean, boolean, "health-check"> =
		new Worker(
			"health-check",
			() => {
				return Promise.resolve(true);
			},
			{ connection: redis },
			undefined,
			logger,
		);

	const workers = {
		emailWorker,
		signUpWorker,
		healthCheckWorker,
		paymentProcessingWorker,
	} as const;

	async function start() {
		logger.info("Starting worker");
		for (const worker of Object.values(workers)) {
			await worker.waitUntilReady();
		}
		for (const queue of Object.values(queues)) {
			await queue.waitUntilReady();
		}
		logger.info("Worker ready");
	}

	async function close(_signal?: NodeJS.Signals, code?: 0 | 1) {
		for (const worker of Object.values(workers)) {
			await worker.close();
		}
		for (const queue of Object.values(queues)) {
			await queue.close();
		}
		await database.$disconnect();
		await redis.quit();
		logger.flush();
		if (code !== undefined) {
			process.exit(code ?? 0);
		}
		return Promise.resolve();
	}

	process.on("SIGINT", async (signal) => {
		await close(signal, 0);
	});
	process.on("SIGTERM", async (signal) => {
		await close(signal, 0);
	});
	process.on("uncaughtException", async (error) => {
		logger.error(error, "closing");
		await close(undefined, 1);
	});

	return {
		start,
		close,
	};
}

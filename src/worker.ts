import { Redis } from "ioredis";
import { pino } from "pino";
import { env } from "./config.js";
import { dependenciesFactory } from "./lib/fastify/dependencies.js";
import { envToLogger } from "./lib/fastify/logging.js";
import postmark from "./lib/postmark.js";
import { MailService } from "./services/mail/index.js";
import { MailWorkerService } from "./services/mail/worker.js";

export function initWorkers() {
	const redis = new Redis(env.REDIS_CONNECTION_STRING, {
		keepAlive: 1_000 * 60 * 3, // 3 minutes
		maxRetriesPerRequest: 0,
	});
	const dependencies = dependenciesFactory();

	const logger = pino(envToLogger[env.NODE_ENV]);

	const mailService = new MailService(postmark, env.NO_REPLY_EMAIL);
	const mailWorker = MailWorkerService({
		mailService,
		userService: dependencies.apolloServerDependencies.userService,
		redisClient: redis,
		log: logger.child({ worker: "mail" }),
	});

	const workers = [mailWorker];

	const gracefulShutdown = async (signal: "SIGINT" | "SIGTERM") => {
		logger.info(`Received ${signal}, closing server...`);
		await Promise.all(workers.map((worker) => worker.close()));
		await redis.quit();
		process.exit(0);
	};

	process.on("SIGINT", () => gracefulShutdown("SIGINT"));
	process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
	logger.info("Workers initialized");

	return {
		close: async () => {
			await gracefulShutdown("SIGTERM");
		},
	};
}

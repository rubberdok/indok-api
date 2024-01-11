import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { pino } from "pino";
import { env } from "./config.js";
import { envToLogger } from "./lib/fastify/logging.js";
import postmark from "./lib/postmark.js";
import prisma from "./lib/prisma.js";
import { UserRepository } from "./repositories/users/index.js";
import { MailService } from "./services/mail/index.js";
import { MailWorker } from "./services/mail/worker.js";

export function initWorkers() {
	const redis = new Redis(env.REDIS_CONNECTION_STRING, {
		keepAlive: 1_000 * 60 * 3, // 3 minutes
		maxRetriesPerRequest: 0,
	});
	const logger = pino(envToLogger[env.NODE_ENV]);
	const mailService = new MailService(postmark, env.NO_REPLY_EMAIL);
	const userRepository = new UserRepository(prisma);
	const worker = new Worker<
		{ subject: string; receiverId: string },
		{ status: string },
		"welcome" | "waitlist"
	>("email", MailWorker(mailService, userRepository, logger), {
		connection: redis,
	});

	worker.on("ready", () => {
		logger.info("Mail worker ready");
	});

	worker.on("error", (error) => {
		logger.error(error, "Mail worker error");
	});

	worker.on("failed", (job, error) => {
		logger.error({ error, job }, "Mail job failed");
	});

	const gracefulShutdown = async (signal: "SIGINT" | "SIGTERM") => {
		logger.info(`Received ${signal}, closing server...`);
		await worker.close();
		await redis.quit();
		process.exit(0);
	};

	process.on("SIGINT", () => gracefulShutdown("SIGINT"));
	process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
}

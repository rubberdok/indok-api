import { QueueEvents } from "bullmq";
import { Redis } from "ioredis";
import { env } from "~/config.js";
import { Queue } from "./queue.js";
import { initWorkers } from "./worker.js";

describe("Worker initialization", () => {
	let mqRedis: Redis;
	let eventsRedis: Redis;
	let worker: Awaited<ReturnType<typeof initWorkers>>["worker"];

	beforeAll(() => {
		mqRedis = new Redis(env.REDIS_CONNECTION_STRING, {
			maxRetriesPerRequest: 0,
		});
		eventsRedis = new Redis(env.REDIS_CONNECTION_STRING, {
			maxRetriesPerRequest: 0,
		});
	});

	afterAll(() => {
		mqRedis.disconnect();
		eventsRedis.disconnect();
		worker.close(() => {});
	});

	it("should initialize a worker ready to receive messages", async () => {
		({ worker } = await initWorkers());

		worker.start();
		const healthCheckQueue = new Queue("health-check", { connection: mqRedis });
		const job = await healthCheckQueue.add("health-check", {});

		const result = await job.waitUntilFinished(
			new QueueEvents("health-check", { connection: eventsRedis }),
		);

		expect(result).toBe(true);
		await healthCheckQueue.close();
	});
});

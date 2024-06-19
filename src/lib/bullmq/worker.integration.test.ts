import { QueueEvents } from "bullmq";
import { Redis } from "ioredis";
import { env } from "~/config.js";
import { Queue } from "./queue.js";
import { initWorkers } from "./worker.js";

describe("Worker initialization", () => {
	let mqRedis: Redis;
	let eventsRedis: Redis;
	let worker: Awaited<ReturnType<typeof initWorkers>>;
	let queueEvents: QueueEvents;
	let queue: Queue;

	beforeAll(() => {
		mqRedis = new Redis(env.REDIS_CONNECTION_STRING, {
			maxRetriesPerRequest: 0,
		});
		eventsRedis = new Redis(env.REDIS_CONNECTION_STRING, {
			maxRetriesPerRequest: 0,
		});
		queueEvents = new QueueEvents("health-check", { connection: eventsRedis });
		queue = new Queue("health-check", { connection: mqRedis });
	});

	afterAll(async () => {
		await queueEvents.close();
		await queue.close();
		mqRedis.disconnect();
		eventsRedis.disconnect();
		await worker.close();
	});

	it("should initialize a worker ready to receive messages", async () => {
		worker = await initWorkers();

		worker.start();
		const job = await queue.add("health-check", {});

		const result = await job.waitUntilFinished(queueEvents);

		expect(result).toBe(true);
	});
});

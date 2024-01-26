import type { Plugin } from "avvio";
import { Redis } from "ioredis";

const avvioRedis: Plugin<{ url: string }, { redis?: Redis }> = (
	instance,
	opts,
) => {
	instance.redis = new Redis(opts.url, {
		keepAlive: 1_000 * 60 * 3, // 3 minutes
		maxRetriesPerRequest: 0,
	});
};

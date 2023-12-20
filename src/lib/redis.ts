import { FastifyInstance } from "fastify";
import { Redis } from "ioredis";

import { env } from "@/config.js";

export function createRedisClient(app: FastifyInstance): Redis {
  /**
   * Configure session plugin with Redis as session store
   *
   * Azure Redis Cache is used as the production session store,
   * and importantly, it closes connections after 10 minutes of inactivity.
   * As such, we need to keep the connection alive.
   * https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-best-practices-connection#idle-timeout
   *
   * @todo figure out if we have some way of using tcp.keepalive, otherwise use ping
   */
  const redisClient = new Redis(env.REDIS_CONNECTION_STRING, {
    keepAlive: 1_000 * 60 * 3, // 3 minutes
  });

  redisClient.on("connect", () => {
    app.log.info("Connected to Redis client.");
  });
  redisClient.on("reconnecting", () => {
    app.log.info("Reconnecting to Redis client.");
  });
  redisClient.on("close", () => {
    app.log.info("Redis client connection closed.");
  });
  redisClient.on("error", (err) => {
    app.Sentry.captureException(err, {
      level: "fatal",
    });
    app.log.fatal(err);
    process.exit(1);
  });
  return redisClient;
}

import fs from "fs";

import { default as _RedisStore } from "connect-redis";
import session from "express-session";
import { createClient } from "redis";

import { env } from "@/config.js";

const cert = env.REDIS_CERT_PATH ? fs.readFileSync(env.REDIS_CERT_PATH) : "";

export const RedisStore = _RedisStore(session);
export const redisClient = createClient({
  legacyMode: true,
  url: env.REDIS_CONNECTION_STRING,
  socket: {
    tls: true,
    cert,
  },
});

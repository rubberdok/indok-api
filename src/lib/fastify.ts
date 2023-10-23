import { env } from "@/config.js";
import { FastifyServerOptions } from "fastify";

export const envToLogger: Record<"development" | "production" | "test", FastifyServerOptions["logger"]> = {
  development: {
    enabled: env.LOG_ENABLED,
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  },
  production: {
    enabled: true,
    redact: ["*.firstName", "*.lastName", "*.email", "*.username", "*.allergies", "*.user"],
  },
  test: env.LOG_ENABLED,
};

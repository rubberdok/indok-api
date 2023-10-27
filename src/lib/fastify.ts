import { FastifyServerOptions } from "fastify";
import { PinoLoggerOptions } from "fastify/types/logger.js";

import { env } from "@/config.js";

/**
 * Redact personally identifiable information (PII) from logs
 * to try to be GDPR compliant, and avoid storing sensitive data in logs.
 */
const redact: PinoLoggerOptions["redact"] = [
  "*.firstName",
  "*.lastName",
  "*.email",
  "*.username",
  "*.allergies",
  "*.user",
];

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
    redact,
  },
  production: {
    enabled: true,
    redact,
  },
  test: env.LOG_ENABLED,
};

/**
 * Extend the Fastify session interface to include our custom properties.
 */
declare module "fastify" {
  interface Session {
    codeVerifier?: string;
    userId?: string;
    authenticated: boolean;
  }
}

import { FastifyServerOptions } from "fastify";

export const envToLogger: Record<"development" | "production" | "test", FastifyServerOptions["logger"]> = {
  development: {
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
  test: false,
};

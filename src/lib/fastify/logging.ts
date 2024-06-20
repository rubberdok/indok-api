import type { LoggerOptions } from "pino";
import { env } from "~/config.js";

/**
 * Redact personally identifiable information (PII) from logs
 * to try to be GDPR compliant, and avoid storing sensitive data in logs.
 */
const redact: LoggerOptions["redact"] = [
	"*.firstName",
	"*.lastName",
	"*.email",
	"*.username",
	"*.allergies",
	"*.user",
];

export const envToLogger: Record<
	"development" | "production" | "test",
	Omit<LoggerOptions, "hooks">
> = {
	development: {
		enabled: env.LOG_ENABLED,
		redact,
	},
	production: {
		enabled: true,
		redact,
	},
	test: {
		enabled: env.LOG_ENABLED,
	},
};

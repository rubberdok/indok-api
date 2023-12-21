import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: ".env" });
dotenv.config();

const envVarsSchema = z.object({
	CORS_CREDENTIALS: z.string().transform((v) => v === "true"),
	CORS_ORIGINS: z.string().transform((v) => v.split(",")),
	DATABASE_CONNECTION_STRING: z.string(),
	FEIDE_BASE_URL: z.string().url(),
	FEIDE_CLIENT_ID: z.string(),
	FEIDE_CLIENT_SECRET: z.string(),
	LOG_ENABLED: z
		.string()
		.default("false")
		.transform((v) => v === "true"),
	NO_REPLY_EMAIL: z.string().email(),
	NODE_ENV: z.enum(["development", "production", "test"]),
	PORT: z
		.string()
		.transform((val) => Number.parseInt(val))
		.default("4000"),
	POSTMARK_API_TOKEN: z.string(),
	RATE_LIMIT_MAX: z
		.string()
		.transform((val) => Number.parseInt(val))
		.default("1000"),
	REDIS_CONNECTION_STRING: z.string(),
	SENTRY_DSN: z.string().optional(),
	SENTRY_RELEASE: z.string().optional(),
	SENTRY_TRACES_SAMPLE_RATE: z
		.string()
		.transform((val) => Number.parseFloat(val))
		.default("1"),
	SERVER_URL: z.string(),
	SESSION_COOKIE_DOMAIN: z.string(),
	SESSION_COOKIE_HTTP_ONLY: z.string().transform((val) => val === "true"),
	SESSION_COOKIE_NAME: z.string(),
	SESSION_COOKIE_SECURE: z.string().transform((val) => val === "true"),
	SESSION_SECRET: z.string(),
});

export const env = envVarsSchema.parse(process.env);

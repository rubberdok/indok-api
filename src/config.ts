import dotenv from "dotenv";
import { z } from "zod";
import { InvalidArgumentError } from "~/domain/errors.js";

const mode = process.env.MODE || "development";
/**
 * Precedence:
 * 1. process.env
 * 2. .env.$(MODE).local
 * 3. .env.local
 * 4. .env.$(MODE)
 * 5. .env
 */
const paths: string[] = [
	`.env.${mode}.local`,
	".env.local",
	`.env.${mode}`,
	".env",
];

dotenv.config({ path: paths, override: false });

const envVarsSchema = z.object({
	AZURE_STORAGE_ACCOUNT_NAME: z.string().optional(),
	AZURE_STORAGE_CONTAINER_NAME: z.string().optional(),
	AZURE_MANAGED_IDENTITY_CLIENT_ID: z.string().optional(),
	CORS_CREDENTIALS: z.string().transform((v) => v === "true"),
	CORS_ORIGINS: z.string().transform((v) => v.split(",")),
	DATABASE_CONNECTION_STRING: z.string(),
	FEIDE_GROUPS_API: z.string().url(),
	FEIDE_BASE_URL: z.string().url(),
	FEIDE_CLIENT_ID: z.string(),
	FEIDE_CLIENT_SECRET: z.string(),
	LOG_ENABLED: z
		.string()
		.default("false")
		.transform((v) => v === "true"),
	NO_REPLY_EMAIL: z.string().email(),
	NODE_ENV: z.enum(["development", "production", "test"]),
	REDIRECT_ORIGINS: z.string().transform((v) => v.split(",")),
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
	SESSION_COOKIE_SAME_SITE: z.enum(["strict", "lax", "none"]).default("lax"),
	SESSION_SECRET: z.string(),
	VIPPS_TEST_MODE: z.string().transform((val) => val === "true"),
	VIPPS_DEFAULT_CLIENT_ID: z.string().optional(),
	VIPPS_DEFAULT_CLIENT_SECRET: z.string().optional(),
	VIPPS_DEFAULT_MERCHANT_SERIAL_NUMBER: z.string().optional(),
	VIPPS_DEFAULT_SUBSCRIPTION_KEY: z.string().optional(),
	CLIENT_URL: z.string().default("https://indokntnu.no"),
	COMPANY_NAME: z.string().default("Rubberdøk"),
	PARENT_COMPANY: z
		.string()
		.default(
			"Foreningen for Studentene ved Industriell Økonomi og Teknologiledelse",
		),
	PRODUCT_NAME: z.string().default("Indøk NTNU"),
	CONTACT_EMAIL: z.string().email(),
});

const parseEnvResult = envVarsSchema.safeParse(process.env);
if (!parseEnvResult.success) {
	throw new InvalidArgumentError(
		"Invalid enviroment variables",
		parseEnvResult.error,
	);
}
const env = parseEnvResult.data;
type Configuration = z.infer<typeof envVarsSchema>;

export { env };
export type { Configuration };

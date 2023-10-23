import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: ".env" });
dotenv.config();

const envVarsSchema = z.object({
  CORS_ORIGINS: z.string().transform((v) => v.split(",")),
  CORS_CREDENTIALS: z.string().transform((v) => v === "true"),
  LOG_ENABLED: z.string().transform((v) => v === "true"),
  NODE_ENV: z.enum(["development", "production", "test"]),
  NO_REPLY_EMAIL: z.string().email(),
  DATABASE_CONNECTION_STRING: z.string(),
  PORT: z
    .string()
    .transform((val) => Number.parseInt(val))
    .default("4000"),
  SENTRY_DSN: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z
    .string()
    .transform((val) => Number.parseFloat(val))
    .default("1"),
  FEIDE_CLIENT_ID: z.string(),
  FEIDE_CLIENT_SECRET: z.string(),
  FEIDE_REDIRECT_URI: z.string(),
  FEIDE_BASE_URL: z.string().url(),
  POSTMARK_API_TOKEN: z.string(),
  SESSION_SECRET: z.string(),
  SESSION_COOKIE_NAME: z.string(),
  SESSION_COOKIE_DOMAIN: z.string(),
  SESSION_COOKIE_HTTP_ONLY: z.string().transform((val) => val === "true"),
  SESSION_COOKIE_SECURE: z.string().transform((val) => val === "true"),
  REDIS_CONNECTION_STRING: z.string(),
});

export const env = envVarsSchema.parse(process.env);

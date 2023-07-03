import * as Sentry from "@sentry/node";

import { env } from "@/config.js";

import { initializeServer } from "./server.js";

Sentry.init({
  dsn: env.SENTRY_DSN,
  tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
});

initializeServer();

import * as Sentry from "@sentry/node";

Sentry.init({
	dsn: process.env.SENTRY_DSN,
	tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE,
	release: process.env.SENTRY_RELEASE,
	environment: process.env.NODE_ENV,
	integrations: [
		Sentry.anrIntegration({ captureStackTrace: true }),
		Sentry.graphqlIntegration(),
		Sentry.redisIntegration(),
		Sentry.prismaIntegration(),
	],
});

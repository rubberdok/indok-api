import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyRedis from "@fastify/redis";
import fastifySession from "@fastify/session";
import fastifyUnderPressure from "@fastify/under-pressure";
import * as Sentry from "@sentry/node";
import RedisStore from "connect-redis";
import fastify, { type FastifyInstance } from "fastify";
import type { Configuration } from "~/config.js";
import { isUserFacingError } from "~/domain/errors.js";
import fastifyAuth from "~/services/auth/plugin.js";
import fastifyApolloServer from "./apollo-server.js";
import fastifyHealthCheck from "./health-check.js";
import { helmetOptionsByEnv } from "./helmet.js";
import { envToLogger } from "./logging.js";

type FastifyServerOptions = {
	sentry?: {
		beforeSend?: NonNullable<Parameters<typeof Sentry.init>[0]>["beforeSend"];
	};
};

async function fastifyServer(
	config: Configuration,
	options?: FastifyServerOptions,
): Promise<{ serverInstance: FastifyInstance }> {
	/**
	 * Initialize Sentry prior to anything else to ensure that we monitor as much as possible.
	 */
	Sentry.init({
		dsn: config.SENTRY_DSN,
		environment: config.NODE_ENV,
		tracesSampleRate: config.SENTRY_TRACES_SAMPLE_RATE,
		release: config.SENTRY_RELEASE,
		beforeSend: options?.sentry?.beforeSend,
		integrations: [
			Sentry.fastifyIntegration(),
			Sentry.prismaIntegration(),
			Sentry.graphqlIntegration(),
			Sentry.anrIntegration(),
		],
	});

	const server = fastify({
		logger: envToLogger[config.NODE_ENV],
		ignoreTrailingSlash: true,
	});

	// Security headers
	server.register(fastifyHelmet, helmetOptionsByEnv[config.NODE_ENV]);

	/**
	 * Register plugins
	 *
	 * CORS:
	 *   - credentials: allow cookies to be sent to the server
	 *   - origin: allow requests from the specified origins
	 */
	await server.register(fastifyCors, {
		credentials: config.CORS_CREDENTIALS,
		origin: config.CORS_ORIGINS,
	});

	// Cookie parser, dependency of fastifySession
	await server.register(fastifyCookie);

	await server.register(fastifyRedis, {
		namespace: "main",
		url: config.REDIS_CONNECTION_STRING,
		keepAlive: 1_000 * 60 * 3, // 3 minutes,
		closeClient: true,
	});

	await server.register(fastifyRedis, {
		namespace: "message-queue",
		url: config.REDIS_CONNECTION_STRING,
		keepAlive: 1_000 * 60 * 3, // 3 minutes
		maxRetriesPerRequest: 0,
		closeClient: true,
	});

	// Rate limit plugin
	await server.register(fastifyRateLimit, {
		max: config.RATE_LIMIT_MAX,
		redis: server.redis.main,
		nameSpace: "rate-limit",
	});

	// Regsiter session plugin
	await server.register(fastifySession, {
		secret: config.SESSION_SECRET,
		cookieName: config.SESSION_COOKIE_NAME,
		saveUninitialized: true,
		store: new RedisStore({
			client: server.redis.main,
		}),
		cookie: {
			httpOnly: config.SESSION_COOKIE_HTTP_ONLY,
			secure: config.SESSION_COOKIE_SECURE,
			domain: config.SESSION_COOKIE_DOMAIN,
			sameSite: config.SESSION_COOKIE_SAME_SITE,
			maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
		},
	});

	// Register under pressure plugin to monitor server health
	await server.register(fastifyUnderPressure, {
		exposeStatusRoute: true,
	});

	/**
	 * Set custom error handler to handle user-facing errors
	 */
	server.setErrorHandler((error, _request, reply) => {
		if (isUserFacingError(error)) {
			switch (error.code) {
				// fallthrough
				case "BAD_REQUEST":
				case "BAD_USER_INPUT":
					reply.code(400);
					break;
				case "PERMISSION_DENIED":
					reply.code(403);
					break;
				case "UNAUTHORIZED":
					reply.code(401);
					break;
				case "NOT_FOUND":
					reply.code(404);
					break;
			}
			reply.send({
				message: error.message,
				code: error.code,
				error: error.name,
			});
		} else {
			// Handle these errors with the default error handler
			reply.send(error);
		}
	});

	await server.register(fastifyHealthCheck, { prefix: "/-" });
	await server.register(fastifyAuth, { prefix: "/auth" });
	await server.register(fastifyApolloServer, { configuration: config });

	return { serverInstance: server };
}

export { fastifyServer };
export type { FastifyServerOptions };

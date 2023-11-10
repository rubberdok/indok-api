import { ApolloServer } from "@apollo/server";
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from "@apollo/server/plugin/landingPage/default";
import fastifyApollo, { ApolloFastifyContextFunction, fastifyApolloDrainPlugin } from "@as-integrations/fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifySession from "@fastify/session";
import fastifySentry from "@immobiliarelabs/fastify-sentry";
import RedisStore from "connect-redis";
import fastify, { FastifyInstance } from "fastify";
import { createClient } from "redis";

import { env } from "./config.js";
import { BadRequestError } from "./core/errors.js";
import { resolvers } from "./graphql/resolvers.generated.js";
import { typeDefs } from "./graphql/typeDefs.generated.js";
import { IContext, getFormatErrorHandler } from "./lib/apolloServer.js";
import { envToLogger } from "./lib/fastify.js";
import { migrationHealthCheck } from "./lib/prisma.js";
import { fastifyApolloSentryPlugin } from "./lib/sentry.js";
import { AuthService } from "./services/auth/index.js";
import { CabinService } from "./services/cabins/service.js";
import { OrganizationService } from "./services/organizations/index.js";
import { UserService } from "./services/users/index.js";

interface Dependencies {
  cabinService: CabinService;
  userService: UserService;
  authService: AuthService;
  organizationService: OrganizationService;
  createRedisClient: (app: FastifyInstance) => ReturnType<typeof createClient>;
}

interface Options {
  port: number;
  host: string;
}

/**
 * Initialize the Fastify server with an Apollo Server instance.
 *
 * This function is typically called from `src/index.ts` and is the entrypoint to the application.
 * Roughly speaking, this function performs the following steps:
 * 1. Set up and inject dependencies
 *    - PrismaClient (database client)
 *    - Services and Repositories (business logic, data access, and external services)
 *
 * 2. Set up a Fastify server instance
 *    - Set up Sentry monitoring, which we use to monitor the server for errors and performance issues
 *    - Set up security headers, which we use to prevent some common attacks
 *    - Set up CORS, which we use to allow requests from the client
 *    - Set up cookies, which we use to store the session ID on the client
 *    - Set up sessions, which we use for authentication so that we can identify the user making the request
 *
 * 3. Set up and connect to Redis, which is a key-value store that we use to store session data
 *
 * 4. Add some lifecycle hooks to the Fastify server, for instance to close the Redis connection when the server closes
 *
 * 5. Set up Apollo Server
 *    - Set up the Apollo Server instance
 *    - Set up the Apollo Server context function, which is used to inject dependencies into the Apollo Server context
 *    - Set up the Apollo Server plugin, which is used to drain the Fastify request and response objects from the Apollo Server context
 *    - Set up the Apollo Server landing page plugin, which is used to display the Apollo Server landing page
 *
 * 6. Set up two health check routes:
 *    - `/-/health` - returns `200: {"status": "ok"}` if the server is running.
 *    - `/-/migration-health` - returns `200: {"status": "ok"}` if the Prisma migrations in `prisma/migrations`
 *      are reflected in the database, `503: { "status": "error", "message": "Missing migrations" }` otherwise.
 *      This health check is used by the StartupProbe for the server container to check if the server is ready to
 *      receive connections. See `infrastructure/modules/server/server_app.tf` for details.
 *
 *      The deployment flow is as follows:
 *      1. The server container is started, but the StartupProbe fails because the migrations are not reflected in the database.
 *      2. A separate, but identical, container is started, with `command: ["npm", "run", "db:migrate"]`
 *      3. The migration container runs the migrations, and then exits.
 *      4. The migrations are now reflected in the database, and the StartupProbe succeeds, allowing the server container to receive connections.
 *
 * 7. Start the Fastify server
 *
 * @todo Configure security headers
 * @returns The Fastify server instance
 */
export async function initServer(dependencies: Dependencies, opts: Options): Promise<FastifyInstance> {
  const { authService, cabinService, organizationService, userService, createRedisClient } = dependencies;

  const app = fastify({ logger: envToLogger[env.NODE_ENV], ignoreTrailingSlash: true });

  /**
   * Set up Sentry monitoring
   */
  app.register(fastifySentry, {
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
  });

  // Security headers
  app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [
          "'self'",
          /** @by-us - adds graphiql support over helmet's default CSP */
          "'unsafe-inline'",
          /** add support for apollo sandbox */
          "https://sandbox.embed.apollographql.com/",
        ],
        scriptSrc: [
          "'self'",
          /** @by-us - adds graphiql support over helmet's default CSP */
          "'unsafe-inline'",
          /** @by-us - adds graphiql support over helmet's default CSP */
          "'unsafe-eval'",
          /** add support for apollo sandbox */
          "https://embeddable-sandbox.cdn.apollographql.com/",
        ],
      },
    },
  });

  /**
   * Register plugins
   *
   * CORS:
   *   - credentials: allow cookies to be sent to the server
   *   - origin: allow requests from the specified origins
   */
  await app.register(fastifyCors, {
    credentials: env.CORS_CREDENTIALS,
    origin: env.CORS_ORIGINS,
  });

  // Cookie parser, dependency of fastifySession
  await app.register(fastifyCookie);

  // Must be called after `Sentry` is registered
  const redisClient = createRedisClient(app);
  await redisClient.connect();

  // Regsiter session plugin
  await app.register(fastifySession, {
    secret: env.SESSION_SECRET,
    cookieName: env.SESSION_COOKIE_NAME,
    store: new RedisStore({
      client: redisClient,
    }),
    cookie: {
      httpOnly: env.SESSION_COOKIE_HTTP_ONLY,
      secure: env.SESSION_COOKIE_SECURE,
      domain: env.SESSION_COOKIE_DOMAIN,
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  });

  /**
   * Default `authenticated` session variable to false if it is undefined
   */
  app.addHook("preHandler", async (request) => {
    if (typeof request.session.get("authenticated") === "undefined") {
      request.session.set("authenticated", false);
    }
  });

  /**
   * Close Redis connection when the server closes
   */
  app.addHook("onClose", async () => {
    await redisClient.quit();
  });

  // Initialize Apollo Server
  const apollo = new ApolloServer<IContext>({
    typeDefs: typeDefs,
    csrfPrevention: true,
    introspection: true,
    resolvers: resolvers,
    formatError: getFormatErrorHandler(app),
    plugins: [
      fastifyApolloDrainPlugin(app),
      fastifyApolloSentryPlugin(app),
      env.NODE_ENV === "production"
        ? ApolloServerPluginLandingPageProductionDefault({ footer: false })
        : ApolloServerPluginLandingPageLocalDefault({ footer: false, includeCookies: true, embed: true }),
    ],
  });

  // Custom context function to inject dependencies into the Apollo Context
  const contextFunction: ApolloFastifyContextFunction<IContext> = async (req, res) => {
    return {
      cabinService,
      userService,
      authService,
      organizationService,
      req,
      res,
    };
  };

  await apollo.start();
  await app.register(fastifyApollo(apollo), {
    context: contextFunction,
  });

  /**
   * Straight forward health check, currently just used for testing.
   */
  app.route({
    url: "/-/health",
    method: "GET",
    handler: async (req, reply) => {
      reply.statusCode = 200;
      return reply.send({ status: "ok" });
    },
  });

  /**
   * Migration health check, used by the StartupProbe for the server container to check if the server is ready to
   * receive connections. See `infrastructure/modules/server/server_app.tf` for infrastructure details.
   * @returns `200: {"status": "ok"}` if the Prisma migrations in `prisma/migrations` are applied, `503: { "status": "error", "message": "Missing migrations" }` otherwise.
   */
  app.route({
    url: "/-/migration-health",
    method: "GET",
    handler: async (req, reply) => {
      req.log.info("Health check");
      const { status, message } = await migrationHealthCheck(app);
      if (!status) {
        req.log.info("Health check failed");
        reply.statusCode = 503;
        return reply.send({ message, status: "error" });
      } else {
        req.log.info("Health check succeeded");
        reply.statusCode = 200;
        return reply.send({ statusCode: 200, status: "ok" });
      }
    },
  });

  app.route<{
    Querystring: {
      state: string;
    };
  }>({
    url: "/login",
    method: "GET",
    schema: {
      querystring: {
        state: { type: "string" },
      },
    },
    handler: async (req, reply) => {
      const { state } = req.query;
      const { codeVerifier, url } = authService.ssoUrl(state);
      req.session.set("codeVerifier", codeVerifier);

      return reply.redirect(303, url);
    },
  });

  app.route<{
    Querystring: {
      code: string;
      state: string;
    };
  }>({
    url: "/authenticate",
    method: "GET",
    schema: {
      querystring: {
        code: { type: "string" },
        state: { type: "string" },
      },
    },
    handler: async (req, reply) => {
      const { code, state } = req.query;
      const codeVerifier = req.session.get("codeVerifier");

      req.log.info("Authenticating user", { code, state, codeVerifier });

      if (!codeVerifier) {
        throw new BadRequestError("Missing code verifier");
      }

      const user = await authService.getUser({ code, codeVerifier });

      req.session.set("authenticated", true);
      req.session.set("userId", user.id);
      req.log.info("User authenticated", { userId: user.id });

      return reply.redirect(303, state);
    },
  });

  const { port, host } = opts;

  /**
   * Start the Fastify server
   */
  try {
    await app.listen({
      port,
      host,
    });
  } catch (err) {
    // Log the error
    app.log.fatal(err);
    // Capture the error with Sentry and exit the process
    app.Sentry.captureException(err, {
      level: "fatal",
      tags: {
        kind: "server",
      },
    });
    process.exit(1);
  }

  return app;
}

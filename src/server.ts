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
import { PrismaClient } from "@prisma/client";
import RedisStore from "connect-redis";
import fastify from "fastify";
import { createClient } from "redis";

import { env } from "./config.js";
import { resolvers } from "./graphql/resolvers.js";
import { typeDefs } from "./graphql/type-defs.js";
import { migrationHealthCheck } from "./health.js";
import { IContext, formatError } from "./lib/apolloServer.js";
import { envToLogger } from "./lib/fastify.js";
import postmark from "./lib/postmark.js";
import { fastifyApolloSentryPlugin } from "./lib/sentry.js";
import { CabinRepository } from "./repositories/cabins/index.js";
import { MemberRepository } from "./repositories/organizations/members.js";
import { OrganizationRepository } from "./repositories/organizations/organizations.js";
import { UserRepository } from "./repositories/users/index.js";
import { feideClient } from "./services/auth/clients.js";
import { FeideService } from "./services/auth/index.js";
import { CabinService } from "./services/cabins/index.js";
import { MailService } from "./services/mail/index.js";
import { OrganizationService } from "./services/organizations/service.js";
import { UserService } from "./services/users/index.js";

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
 * 6. Set up a health check route, which is currently only used for testing
 *
 * 7. Start the Fastify server
 *
 * @todo Configure security headers
 * @returns The Fastify server instance
 */
export async function initServer() {
  // Set up and inject dependencies
  const prisma = new PrismaClient();

  const userRepository = new UserRepository(prisma);
  const userService = new UserService(userRepository);

  const memberRepository = new MemberRepository(prisma);
  const organizationRepository = new OrganizationRepository(prisma);
  const organizationService = new OrganizationService(organizationRepository, memberRepository, userService);

  const cabinRepository = new CabinRepository(prisma);
  const mailService = new MailService(postmark);
  const cabinService = new CabinService(cabinRepository, mailService);

  const authService = new FeideService(userService, feideClient);

  const app = fastify({ logger: envToLogger[env.NODE_ENV] });

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
  /**
   * Configure session plugin with Redis as session store
   *
   * Azure Redis Cache is used as the production session store,
   * and importantly, it closes connections after 10 minutes of inactivity.
   * As such, we need to keep the connection alive.
   * https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-best-practices-connection#idle-timeout
   *
   * @todo figure out if we have some way of using tcp.keepalive, otherwise use ping
   */
  const redisClient = createClient({
    url: env.REDIS_CONNECTION_STRING,
    pingInterval: 1_000 * 60 * 3, // 3 minutes
    socket: {
      keepAlive: 1_000 * 60 * 3, // 3 minutes
    },
  });

  redisClient.on("connect", () => {
    app.log.info("Connected to Redis client.");
  });

  redisClient.on("error", (err) => {
    app.Sentry.captureException(err, {
      level: "fatal",
    });
    app.log.fatal(err);
    process.exit(1);
  });

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
  app.addHook("preHandler", (request, reply, next) => {
    if (typeof request.session.get("authenticated") === "undefined") {
      request.session.set("authenticated", false);
    }
    next();
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
    formatError: formatError,
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

  app.route({
    url: "/-/health",
    method: "GET",
    handler: async (req, reply) => {
      reply.statusCode = 200;
      return reply.send({ status: "ok" });
    },
  });

  app.route({
    url: "/-/migration-health",
    method: "GET",
    handler: async (req, reply) => {
      req.log.info("Health check");
      const { status, message } = migrationHealthCheck(app);
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

  try {
    await app.listen({
      port: env.PORT,
      host: "0.0.0.0",
    });
  } catch (err) {
    app.log.fatal(err);
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

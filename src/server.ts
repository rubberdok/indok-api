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
import { merge } from "lodash-es";
import { createClient } from "redis";

import { env } from "./config.js";
import { resolvers } from "./graphql/resolvers.generated.js";
import { typeDefs } from "./graphql/typeDefs.generated.js";
import { IContext, getFormatErrorHandler } from "./lib/apollo-server.js";
import { healthCheckPlugin } from "./lib/fastify/health-checks.js";
import { envToLogger } from "./lib/fastify/logging.js";
import postmark from "./lib/postmark.js";
import prisma from "./lib/prisma.js";
import { createRedisClient } from "./lib/redis.js";
import { fastifyApolloSentryPlugin } from "./lib/sentry.js";
import { CabinRepository } from "./repositories/cabins/index.js";
import { MemberRepository } from "./repositories/organizations/members.js";
import { OrganizationRepository } from "./repositories/organizations/organizations.js";
import { UserRepository } from "./repositories/users/index.js";
import { feideClient } from "./services/auth/clients.js";
import { AuthService, FeideProvider } from "./services/auth/index.js";
import { getAuthPlugin } from "./services/auth/plugin.js";
import { CabinService } from "./services/cabins/service.js";
import { MailService } from "./services/mail/index.js";
import { OrganizationService } from "./services/organizations/index.js";
import { UserService } from "./services/users/index.js";

export interface Dependencies {
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
 * Utility function to create a `Dependencies` object with the specified overrides.
 * @param overrides - The overrides to apply to the default `Dependencies` object.
 * @returns A `Dependencies` object with the specified overrides.
 */
export function dependenciesFactory(overrides?: Partial<Dependencies>): Dependencies {
  const cabinRepository = new CabinRepository(prisma);
  const userRepository = new UserRepository(prisma);
  const memberRepository = new MemberRepository(prisma);
  const organizationRepository = new OrganizationRepository(prisma);

  const mailService = new MailService(postmark, env.NO_REPLY_EMAIL);
  const cabinService = new CabinService(cabinRepository, mailService);
  const userService = new UserService(userRepository);
  const authService = new AuthService(userService, feideClient, FeideProvider);
  const organizationService = new OrganizationService(organizationRepository, memberRepository, userService);

  const defaultDependencies = {
    cabinService,
    userService,
    authService,
    organizationService,
    createRedisClient: createRedisClient,
  };

  return merge({}, defaultDependencies, overrides);
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
   * Set up Sentry monitoring before anything else
   * so that we can monitor the server for errors and performance issues, even during
   * the initial setup.
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
    saveUninitialized: true,
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

  await app.register(healthCheckPlugin, { prefix: "/-" });
  await app.register(getAuthPlugin(authService), { prefix: "/auth" });

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

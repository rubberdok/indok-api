import { ApolloServer } from "@apollo/server";
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from "@apollo/server/plugin/landingPage/default";
import fastifyApollo, { ApolloFastifyContextFunction, fastifyApolloDrainPlugin } from "@as-integrations/fastify";
import fastifyCookie from "@fastify/cookie";
import cors from "@fastify/cors";
import fastifySession from "@fastify/session";
import { PrismaClient } from "@prisma/client";
import RedisStore from "connect-redis";
import fastify from "fastify";
import { createClient } from "redis";

import { env } from "./config.js";
import { IContext } from "./graphql/context.js";
import { resolvers } from "./graphql/resolvers.js";
import { typeDefs } from "./graphql/type-defs.js";
import { formatError } from "./lib/apolloServer.js";
import postmark from "./lib/postmark.js";
import { CabinRepository } from "./repositories/cabins/index.js";
import { UserRepository } from "./repositories/users/index.js";
import { feideClient } from "./services/auth/clients.js";
import { FeideService } from "./services/auth/index.js";
import { CabinService } from "./services/cabins/index.js";
import { MailService } from "./services/mail/index.js";
import { UserService } from "./services/users/index.js";

export async function initServer() {
  // Set up and inject dependencies
  const prisma = new PrismaClient();

  const userRepository = new UserRepository(prisma);
  const userService = new UserService(userRepository);

  const cabinRepository = new CabinRepository(prisma);
  const mailService = new MailService(postmark);
  const cabinService = new CabinService(cabinRepository, mailService);

  const authService = new FeideService(userService, feideClient);

  const app = fastify({ logger: true });

  /**
   * Register plugins
   *
   * CORS:
   *   - credentials: allow cookies to be sent to the server
   *   - origin: allow requests from the specified origins
   */
  await app.register(cors, {
    credentials: env.CORS_CREDENTIALS,
    origin: env.CORS_ORIGINS,
  });

  // Cookie parser, dependency of fastifySession
  await app.register(fastifyCookie);
  /**
   * Configure session plugin with Redis as session store
   */
  const redisClient = createClient({
    url: env.REDIS_CONNECTION_STRING,
  });
  redisClient.connect().catch(console.error);
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
      maxAge: 1000 * 60 * 60 * 24 * 7,
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

  // Initialize Apollo Server
  const apollo = new ApolloServer<IContext>({
    typeDefs: typeDefs,
    csrfPrevention: true,
    introspection: true,
    resolvers: resolvers,
    formatError: formatError,
    plugins: [
      fastifyApolloDrainPlugin(app),
      env.NODE_ENV === "production"
        ? ApolloServerPluginLandingPageProductionDefault({ footer: false })
        : ApolloServerPluginLandingPageLocalDefault({ footer: false, includeCookies: true }),
    ],
  });

  // Custom context function to inject dependencies into the Apollo Context
  const contextFunction: ApolloFastifyContextFunction<IContext> = async (req, res) => {
    return {
      cabinService,
      userService,
      authService,
      req,
      res,
    };
  };

  await apollo.start();
  await app.register(fastifyApollo(apollo), {
    context: contextFunction,
  });

  try {
    await app.listen({
      port: env.PORT,
      host: "0.0.0.0",
    });
    console.log(`🚀 Server ready at http://localhost:4000/graphql`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  return app;
}

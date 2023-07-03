import { randomUUID } from "crypto";
import http from "http";

import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import * as Sentry from "@sentry/node";
import { json } from "body-parser";
import cors from "cors";
import express from "express";
import session from "express-session";

import { env } from "@/config.js";
import { resolvers, typeDefs } from "@/graphql/index.js";
import { IContext, IContextProvider } from "@/graphql/context.js";
import { formatError } from "@/lib/apolloServer.js";
import postmarkClient from "@/lib/postmark.js";
import prismaClient from "@/lib/prisma.js";
import { RedisStore, redisClient } from "@/lib/redis.js";
import { CabinRepository } from "@/repositories/cabins/index.js";
import { UserRepository } from "@/repositories/users/index.js";
import { FeideService } from "@/services/auth/index.js";
import { CabinService } from "@/services/cabins/index.js";
import { MailService } from "@/services/mail/index.js";
import { UserService } from "@/services/users/index.js";

Sentry.init({
  dsn: env.SENTRY_DSN,
  tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
});

async function initializeServer() {
  console.debug("initializing server");
  const app = express();
  const httpServer = http.createServer(app);

  await redisClient.connect().catch((err) => {
    console.error("Redis connection failed with error", err);
  });
  console.debug("connected to redis client");

  app.use(Sentry.Handlers.requestHandler());
  app.use(
    session({
      name: env.SESSION_COOKIE_NAME,
      genid: () => randomUUID(),
      cookie: {
        domain: env.SESSION_COOKIE_DOMAIN,
        httpOnly: env.SESSION_COOKIE_HTTP_ONLY,
        secure: env.SESSION_COOKIE_SECURE,
      },
      store: new RedisStore({
        client: redisClient,
      }),
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
    })
  );

  console.debug("added sentry and session middleware");

  const server = new ApolloServer<IContext>({
    csrfPrevention: true,
    introspection: true,
    resolvers,
    typeDefs,
    formatError,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer }), ApolloServerPluginLandingPageLocalDefault()],
  });
  console.debug("created apollo server");

  await server.start();
  console.debug("started apollo server");

  const userRepository = new UserRepository(prismaClient);
  const userService = new UserService(userRepository);

  const cabinRepository = new CabinRepository(prismaClient);
  const mailService = new MailService(postmarkClient);
  const cabinService = new CabinService(cabinRepository, mailService);

  const authService = new FeideService(userService);

  app.use(
    "/graphql",
    cors<cors.CorsRequest>({ origin: env.CORS_ORIGINS, credentials: env.CORS_CREDENTIALS }),
    json(),
    expressMiddleware(server, {
      context: async ({ req, res }) => {
        const info: IContextProvider = {
          userService,
          cabinService,
          authService,
        };
        return Object.assign(info, { req, res });
      },
    })
  );
  console.debug("added graphql route");

  await new Promise<void>((resolve) => httpServer.listen({ port: env.PORT }, resolve));

  console.info(`[INFO] ${new Date()} 🚀 Server ready at ${app.path()}/graphql}`);
  console.info("[INFO] CTRL+C to exit");
}

export { initializeServer };

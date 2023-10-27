import { ApolloServer } from "@apollo/server";
import { FastifySessionObject } from "@fastify/session";
import { FastifyReply, FastifyRequest } from "fastify";
import { mock, mockDeep } from "jest-mock-extended";

import { getFormatErrorHandler, IContext } from "@/lib/apolloServer.js";

import { resolvers } from "../resolvers.js";
import typeDefs from "../type-defs.js";

export const createMockApolloServer = () => {
  const server = new ApolloServer<IContext>({
    typeDefs: typeDefs,
    resolvers: resolvers,
    formatError: getFormatErrorHandler(),
  });

  const userService = mockDeep<IContext["userService"]>();
  const organizationService = mockDeep<IContext["organizationService"]>();
  const cabinService = mockDeep<IContext["cabinService"]>();
  const authService = mockDeep<IContext["authService"]>();

  function createMockContext(session: Partial<FastifySessionObject>) {
    const contextValue = {
      req: mock<FastifyRequest>({
        session: mock<FastifySessionObject>(session),
      }),
      res: mock<FastifyReply>(),
      userService,
      organizationService,
      cabinService,
      authService,
    };
    return contextValue;
  }

  return { userService, organizationService, cabinService, authService, createMockContext, server };
};

import { IContext } from "@/graphql/context.js";
import { resolvers } from "@/graphql/resolvers.js";
import { typeDefs } from "@/graphql/type-defs.js";
import { formatError } from "@/lib/apolloServer.js";
import { ApolloServer } from "@apollo/server";
import { faker } from "@faker-js/faker";
import { FastifySessionObject } from "@fastify/session";
import assert from "assert";
import { FastifyReply, FastifyRequest } from "fastify";
import { gql } from "graphql-tag";
import { mock, mockDeep } from "jest-mock-extended";

describe("GraphQL", () => {
  it("server should be correctly defined", async () => {
    const userService = mockDeep<IContext["userService"]>();
    const organizationService = mockDeep<IContext["organizationService"]>();
    const cabinService = mockDeep<IContext["cabinService"]>();
    const authService = mockDeep<IContext["authService"]>();

    userService.getAll.mockResolvedValue([]);

    const server = new ApolloServer<IContext>({
      typeDefs,
      resolvers,
      formatError,
    });

    const res = await server.executeOperation(
      {
        query: gql`
          query {
            users {
              users {
                id
              }
            }
          }
        `,
      },
      {
        contextValue: {
          req: mock<FastifyRequest>({
            session: mock<FastifySessionObject>({ userId: faker.string.uuid() }),
          }),
          res: mock<FastifyReply>(),
          userService,
          organizationService,
          cabinService,
          authService,
        },
      }
    );

    assert(res.body.kind === "single");
    console.log(res.body.singleResult.data);
  });
});

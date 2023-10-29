import assert from "assert";

import { faker } from "@faker-js/faker";
import { ResultOf } from "@graphql-typed-document-node/core";

import { createMockApolloServer } from "@/graphql/test-clients/mockApolloServer.js";
import { graphql } from "@/graphql/test-clients/unit/gql.js";
import { GetUsersDocument } from "@/graphql/test-clients/unit/graphql.js";

describe("GraphQL", () => {
  it("server should be correctly defined", async () => {
    const { userService, server, createMockContext } = createMockApolloServer();

    userService.getAll.mockResolvedValue([]);

    const res = await server.executeOperation<ResultOf<typeof GetUsersDocument>>(
      {
        query: graphql(`
          query getUsers {
            users {
              users {
                id
              }
              total
            }
          }
        `),
      },
      {
        contextValue: createMockContext({ userId: faker.string.uuid() }),
      }
    );

    assert(res.body.kind === "single");
    expect(res.body.singleResult.data?.users.total).toBe(0);
  });
});

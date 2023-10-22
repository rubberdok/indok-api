import { createMockApolloServer } from "@/graphql/__mocks__/apolloServer.js";
import { UsersResponse } from "@/graphql/__types__.js";
import { faker } from "@faker-js/faker";
import assert from "assert";
import { gql } from "graphql-tag";

describe("GraphQL", () => {
  it("server should be correctly defined", async () => {
    const { userService, server, createMockContext } = createMockApolloServer();

    userService.getAll.mockResolvedValue([]);

    const res = await server.executeOperation<{ users: UsersResponse }>(
      {
        query: gql`
          query {
            users {
              users {
                id
              }
              total
            }
          }
        `,
      },
      {
        contextValue: createMockContext({ userId: faker.string.uuid() }),
      }
    );

    assert(res.body.kind === "single");
    expect(res.body.singleResult.data?.users.total).toBe(0);
  });
});

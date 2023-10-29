import assert from "assert";

import { gql } from "graphql-tag";

import { codes } from "@/core/errors.js";
import { createMockApolloServer } from "@/graphql/test-clients/mockApolloServer.js";

describe("OrganizationResolvers", () => {
  describe("Mutation", () => {
    describe("createOrganization", () => {
      it("should raise AuthenticationError if the user is not authenticated", async () => {
        /**
         * Arrange
         *
         * 1. Create a mock ApolloServer
         * 2. Create the mock context without a userId in session
         */
        const { server, createMockContext } = createMockApolloServer();
        const contextValue = createMockContext({ userId: undefined });

        /**
         * Act
         *
         * 1. Query the server with the createOrganization mutation
         */
        const res = await server.executeOperation(
          {
            query: gql`
              mutation {
                createOrganization(data: { name: "test" }) {
                  organization {
                    id
                  }
                }
              }
            `,
          },
          {
            contextValue,
          }
        );
        assert(res.body.kind === "single");
        expect(res.body.singleResult.errors?.[0]?.extensions?.code).toBe(codes.ERR_PERMISSION_DENIED);
      });
    });
  });
});

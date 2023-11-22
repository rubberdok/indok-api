import { createMockApolloServer } from "@/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "@/graphql/test-clients/unit/gql.js";

describe("Organization queries", () => {
  describe("organizations", () => {
    it("should not throw PermissionDeniedError for unauthenticated users", async () => {
      const { client, organizationService } = createMockApolloServer();

      organizationService.findMany.mockResolvedValue([]);

      const { errors } = await client.query({
        query: graphql(`
          query organizations {
            organizations {
              organizations {
                id
              }
            }
          }
        `),
      });

      expect(errors).toBeUndefined();
      expect(organizationService.findMany).toHaveBeenCalled();
    });
  });
});

import { faker } from "@faker-js/faker";
import { Listing } from "@prisma/client";
import { mock } from "jest-mock-extended";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Listing queries", () => {
  describe("listings", () => {
    it("should return listings", async () => {
      const { client, listingService } = createMockApolloServer();
      listingService.findMany.mockResolvedValue([
        mock<Listing>({ id: faker.string.uuid() }),
        mock<Listing>({ id: faker.string.uuid() }),
      ]);

      const { errors } = await client.query({
        query: graphql(`
          query listings {
            listings {
              listings {
                id
              }
            }
          }
        `),
      });

      expect(errors).toBeUndefined();
      expect(listingService.findMany).toHaveBeenCalled();
    });
  });
});

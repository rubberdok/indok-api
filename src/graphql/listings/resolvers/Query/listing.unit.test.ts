import { faker } from "@faker-js/faker";
import { Listing } from "@prisma/client";
import { mock } from "jest-mock-extended";

import { createMockApolloServer } from "@/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "@/graphql/test-clients/unit/gql.js";

describe("Listing queries", () => {
  describe("listing", () => {
    it("should return an listing", async () => {
      const { client, listingService } = createMockApolloServer(console);
      listingService.get.mockResolvedValue(mock<Listing>({ id: faker.string.uuid() }));

      const { errors } = await client.query({
        query: graphql(`
          query listing($data: ListingInput!) {
            listing(data: $data) {
              listing {
                id
              }
            }
          }
        `),
        variables: {
          data: { id: faker.string.uuid() },
        },
      });

      expect(errors).toBeUndefined();
      expect(listingService.get).toHaveBeenCalledWith(expect.any(String));
    });
  });
});

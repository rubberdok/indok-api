import { faker } from "@faker-js/faker";
import { Listing } from "@prisma/client";
import { mock } from "jest-mock-extended";
import { errorCodes } from "~/domain/errors.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Listing mutations", () => {
  describe("updateListing", () => {
    it("should attempt to update a listing", async () => {
      const { client, listingService, createMockContext } =
        createMockApolloServer();
      const authenticatedContext = createMockContext({
        userId: faker.string.uuid(),
        authenticated: true,
      });
      listingService.update.mockResolvedValue(
        mock<Listing>({ id: faker.string.uuid() }),
      );

      const { errors } = await client.mutate(
        {
          mutation: graphql(`
            mutation updateListing($id: ID!, $data: UpdateListingInput!) {
              updateListing(id: $id, data: $data) {
                listing {
                  id
                }
              }
            }
          `),
          variables: {
            id: faker.string.uuid(),
            data: {
              name: faker.lorem.sentence(),
            },
          },
        },
        { contextValue: authenticatedContext },
      );

      expect(errors).toBeUndefined();
      expect(listingService.update).toHaveBeenCalledWith(
        authenticatedContext.req.session.userId,
        expect.any(String),
        {
          name: expect.any(String),
        },
      );
    });

    it("should raise permission denied if not authenticated", async () => {
      const { client, listingService, createMockContext } =
        createMockApolloServer();
      const unauthenticatedContext = createMockContext({
        authenticated: false,
      });

      const { errors } = await client.mutate(
        {
          mutation: graphql(`
            mutation updateListing($id: ID!, $data: UpdateListingInput!) {
              updateListing(id: $id, data: $data) {
                listing {
                  id
                }
              }
            }
          `),
          variables: {
            id: faker.string.uuid(),
            data: {
              name: faker.lorem.sentence(),
            },
          },
        },
        { contextValue: unauthenticatedContext },
      );

      expect(errors).toBeDefined();
      expect(
        errors?.some(
          (err) => err.extensions?.code === errorCodes.ERR_PERMISSION_DENIED,
        ),
      ).toBe(true);
      expect(listingService.update).not.toHaveBeenCalled();
    });
  });
});

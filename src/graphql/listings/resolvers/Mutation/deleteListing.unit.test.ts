import { faker } from "@faker-js/faker";
import { Listing } from "@prisma/client";
import { mock } from "jest-mock-extended";
import { errorCodes } from "~/domain/errors.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Listing mutations", () => {
  describe("deleteListing", () => {
    it("should attempt to delete a listing", async () => {
      const { client, listingService, createMockContext } =
        createMockApolloServer();
      const authenticatedContext = createMockContext({
        userId: faker.string.uuid(),
        authenticated: true,
      });
      listingService.delete.mockResolvedValue(
        mock<Listing>({ id: faker.string.uuid() }),
      );

      const { errors } = await client.mutate(
        {
          mutation: graphql(`
            mutation deleteListing($data: DeleteListingInput!) {
              deleteListing(data: $data) {
                listing {
                  id
                }
              }
            }
          `),
          variables: {
            data: {
              id: faker.string.uuid(),
            },
          },
        },
        { contextValue: authenticatedContext },
      );

      expect(errors).toBeUndefined();
      expect(listingService.delete).toHaveBeenCalledWith(
        authenticatedContext.req.session.userId,
        expect.any(String),
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
            mutation deleteListing($data: DeleteListingInput!) {
              deleteListing(data: $data) {
                listing {
                  id
                }
              }
            }
          `),
          variables: {
            data: {
              id: faker.string.uuid(),
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
      expect(listingService.delete).not.toHaveBeenCalled();
    });
  });
});

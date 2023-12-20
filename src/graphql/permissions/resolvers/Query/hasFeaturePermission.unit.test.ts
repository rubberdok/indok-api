import { faker } from "@faker-js/faker";
import { errorCodes } from "~/domain/errors.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Permission queries", () => {
  describe("#hasFeaturePermission", () => {
    it("should raise PermissionDeniedError if the user is not authenticated", async () => {
      const { client } = createMockApolloServer();

      const { errors } = await client.query({
        query: graphql(`
          query UnauthenticatedHasPermission($data: HasFeaturePermissionInput!) {
            hasFeaturePermission(data: $data) {
              hasFeaturePermission
              id
            }
          }
        `),
        variables: {
          data: {
            featurePermission: "CABIN_BOOKING",
          },
        },
      });

      expect(errors).toBeDefined();
      expect(errors).toHaveLength(1);
      expect(errors?.every((err) => err.extensions?.code === errorCodes.ERR_PERMISSION_DENIED)).toBe(true);
    });

    it("should call hasFeaturePermission with the correct parameters", async () => {
      const { client, createMockContext, permissionService } = createMockApolloServer();
      const authenticatedContext = createMockContext({
        user: {
          id: faker.string.uuid(),
        },
      });
      permissionService.hasFeaturePermission.mockResolvedValueOnce(true);

      const { errors } = await client.query(
        {
          query: graphql(`
            query UnauthenticatedHasPermission($data: HasFeaturePermissionInput!) {
              hasFeaturePermission(data: $data) {
                hasFeaturePermission
                id
              }
            }
          `),
          variables: {
            data: {
              featurePermission: "CABIN_BOOKING",
            },
          },
        },
        {
          contextValue: authenticatedContext,
        },
      );

      expect(errors).toBeUndefined();
      expect(permissionService.hasFeaturePermission).toHaveBeenCalledWith({
        userId: authenticatedContext.user?.id,
        featurePermission: "CABIN_BOOKING",
      });
    });
  });
});

import { faker } from "@faker-js/faker";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Permission queries", () => {
	describe("#hasFeaturePermission", () => {
		it("should call hasFeaturePermission with the correct parameters", async () => {
			const { client, createMockContext, permissionService } =
				createMockApolloServer();
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
							featurePermission: "CABIN_ADMIN",
						},
					},
				},
				{
					contextValue: authenticatedContext,
				},
			);

			expect(errors).toBeUndefined();
			expect(permissionService.hasFeaturePermission).toHaveBeenCalledWith(
				expect.anything(),
				{
					featurePermission: "CABIN_ADMIN",
				},
			);
		});
	});
});

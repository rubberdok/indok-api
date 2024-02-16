import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import { Role } from "~/domain/organizations.js";
import type { User } from "~/domain/users.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Permission queries", () => {
	describe("hasRole", () => {
		it("should check the role of the logged in user", async () => {
			const { client, permissionService, createMockContext } =
				createMockApolloServer();

			/**
			 * Arrange
			 * Mock the hasRole method of the permission service
			 * to return true
			 */
			permissionService.hasRole.mockResolvedValue(true);
			const organizationId = faker.string.uuid();
			const role = Role.MEMBER;
			const user = mock<User>({ id: faker.string.uuid() });
			const ctx = createMockContext({ user });

			/**
			 * Act
			 */
			const { errors, data } = await client.query(
				{
					query: graphql(`
                    query hasRole($data: HasRoleInput!) {
                        hasRole(data: $data) {
                            hasRole
                        }
                    }
                `),
					variables: {
						data: {
							organizationId,
							role,
						},
					},
				},
				{
					contextValue: ctx,
				},
			);

			/**
			 * Assert
			 */
			expect(errors).toBeUndefined();
			expect(data).toBeDefined();
			expect(data?.hasRole.hasRole).toBe(true);
			expect(permissionService.hasRole).toHaveBeenCalledWith({
				organizationId,
				role,
				userId: user.id,
			});
		});
	});
});

import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import { errorCodes } from "~/domain/errors.js";
import type { User } from "~/domain/users.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("User mutations", () => {
	describe("updateUser", () => {
		it("should update the authenticated user", async () => {
			const { client, createMockContext, userService } =
				createMockApolloServer();
			const contextValue = createMockContext({
				userId: faker.string.uuid(),
				authenticated: true,
			});
			userService.update.mockResolvedValue(
				mock<User>({ id: faker.string.uuid() }),
			);

			const { errors } = await client.mutate(
				{
					mutation: graphql(`
            mutation UpdateAuthenticatedUser($data: UpdateUserInput!) {
              updateUser(data: $data) {
                user {
                  id
                }
              }
            }
          `),
					variables: {
						data: {
							firstName: faker.person.firstName(),
						},
					},
				},
				{
					contextValue,
				},
			);

			expect(errors).toBeUndefined();
			expect(userService.update).toHaveBeenCalledWith(contextValue.user?.id, {
				firstName: expect.any(String),
			});
		});

		it("should raise PermissionDenied if not logged in", async () => {
			const { client, createMockContext, userService } =
				createMockApolloServer();
			const contextValue = createMockContext({ authenticated: false });

			const { errors } = await client.mutate(
				{
					mutation: graphql(`
            mutation UpdateAuthenticatedUser($data: UpdateUserInput!) {
              updateUser(data: $data) {
                user {
                  id
                }
              }
            }
          `),
					variables: {
						data: {
							firstName: faker.person.firstName(),
						},
					},
				},
				{
					contextValue,
				},
			);

			expect(errors).toBeDefined();
			expect(
				errors?.some(
					(error) =>
						error.extensions?.code === errorCodes.ERR_PERMISSION_DENIED,
				),
			).toBe(true);
			expect(userService.update).not.toHaveBeenCalled();
		});
	});
});

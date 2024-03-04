import { faker } from "@faker-js/faker";
import type { EventSignUp, Organization } from "@prisma/client";
import { mock } from "jest-mock-extended";
import { InternalServerError, UnauthorizedError } from "~/domain/errors.js";
import type { User } from "~/domain/users.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("User queries", () => {
	describe("user", () => {
		it("should include organizations for the user", async () => {
			/**
			 * Arrange
			 *
			 * Set up a mock user and organization and an authenticated context.
			 */
			const { client, createMockContext, organizationService, userService } =
				createMockApolloServer();
			const userId = faker.string.uuid();
			const authenticatedContext = createMockContext({ user: { id: userId } });
			const user = mock<User>({ id: userId });
			userService.get.mockResolvedValue(user);
			organizationService.organizations.findMany.mockResolvedValue([
				mock<Organization>({ id: faker.string.uuid() }),
			]);

			/**
			 * Act
			 *
			 * Call the user query.
			 */
			const { errors, data } = await client.query(
				{
					query: graphql(`
            query UserWithOrganizations {
              user {
                user {
                  id
                  organizations {
                    id
                  }
                }
              }
            }
          `),
				},
				{
					contextValue: authenticatedContext,
				},
			);

			/**
			 * Assert
			 *
			 * Ensure that the user query returned the expected data.
			 */
			expect(errors).toBeUndefined();
			expect(data?.user.user?.organizations).toHaveLength(1);
			expect(data?.user.user?.organizations[0]?.id).toEqual(expect.any(String));
		});

		describe("user { signUps }", () => {
			it("resolves sign ups for the user", async () => {
				const { client, createMockContext, eventService } =
					createMockApolloServer();

				const userId = faker.string.uuid();
				const authenticatedContext = createMockContext({
					user: { id: userId },
				});

				const signUp = mock<EventSignUp>({ id: faker.string.uuid() });
				eventService.findManySignUpsForUser.mockResolvedValue({
					ok: true,
					data: {
						signUps: [signUp],
						total: 1,
					},
				});

				const { errors, data } = await client.query(
					{
						query: graphql(`
			  query UserWithSignUps {
				user {
				  user {
					id
					signUps {
					  signUps {
						id
					  }
					  total
					}
				  }
				}
			  }
			`),
					},
					{
						contextValue: authenticatedContext,
					},
				);

				expect(errors).toBeUndefined();
				expect(data?.user.user?.signUps).toEqual({
					signUps: [{ id: signUp.id }],
					total: 1,
				});
				expect(eventService.findManySignUpsForUser).toHaveBeenCalledWith(
					expect.anything(),
					expect.objectContaining({ userId: userId }),
				);
			});

			it("uses orderBy", async () => {
				const { client, createMockContext, eventService } =
					createMockApolloServer();

				const userId = faker.string.uuid();
				const authenticatedContext = createMockContext({
					user: { id: userId },
				});

				const signUp = mock<EventSignUp>({ id: faker.string.uuid() });
				eventService.findManySignUpsForUser.mockResolvedValue({
					ok: true,
					data: {
						signUps: [signUp],
						total: 1,
					},
				});

				const { errors } = await client.query(
					{
						query: graphql(`
			  query UserWithSignUpsAndOrderBy($data: UserSignUpsInput!) {
				user {
				  user {
					id
					signUps(data: $data) {
					  signUps {
						id
					  }
					  total
					}
				  }
				}
			  }
			`),
						variables: {
							data: {
								orderBy: "ASC",
							},
						},
					},
					{
						contextValue: authenticatedContext,
					},
				);

				expect(errors).toBeUndefined();
				expect(eventService.findManySignUpsForUser).toHaveBeenCalledWith(
					expect.anything(),
					expect.objectContaining({ orderBy: "asc" }),
				);
			});

			it("returns 0 and [] if unauthorized", async () => {
				const { client, createMockContext, eventService } =
					createMockApolloServer();

				const userId = faker.string.uuid();
				const authenticatedContext = createMockContext({
					user: { id: userId },
				});

				eventService.findManySignUpsForUser.mockResolvedValue({
					ok: false,
					error: new UnauthorizedError(""),
				});

				const { errors, data } = await client.query(
					{
						query: graphql(`
			  query UserWithSignUps {
				user {
				  user {
					id
					signUps {
					  signUps {
						id
					  }
					  total
					}
				  }
				}
			  }
			`),
					},
					{
						contextValue: authenticatedContext,
					},
				);

				expect(errors).toBeUndefined();
				expect(data?.user.user?.signUps).toEqual({
					signUps: [],
					total: 0,
				});
			});
			it("returns 0 and [] if unauthorized", async () => {
				const { client, createMockContext, eventService } =
					createMockApolloServer();

				const userId = faker.string.uuid();
				const authenticatedContext = createMockContext({
					user: { id: userId },
				});

				eventService.findManySignUpsForUser.mockResolvedValue({
					ok: false,
					error: new UnauthorizedError(""),
				});

				const { errors, data } = await client.query(
					{
						query: graphql(`
			  query UserWithSignUps {
				user {
				  user {
					id
					signUps {
					  signUps {
						id
					  }
					  total
					}
				  }
				}
			  }
			`),
					},
					{
						contextValue: authenticatedContext,
					},
				);

				expect(errors).toBeUndefined();
				expect(data?.user.user?.signUps).toEqual({
					signUps: [],
					total: 0,
				});
			});

			it("throws internal server errors", async () => {
				const { client, createMockContext, eventService } =
					createMockApolloServer();

				const userId = faker.string.uuid();
				const authenticatedContext = createMockContext({
					user: { id: userId },
				});

				eventService.findManySignUpsForUser.mockResolvedValue({
					ok: false,
					error: new InternalServerError(""),
				});

				const { errors } = await client.query(
					{
						query: graphql(`
			  query UserWithSignUps {
				user {
				  user {
					id
					signUps {
					  signUps {
						id
					  }
					  total
					}
				  }
				}
			  }
			`),
					},
					{
						contextValue: authenticatedContext,
					},
				);

				expect(errors).toBeDefined();
			});
		});
	});
});

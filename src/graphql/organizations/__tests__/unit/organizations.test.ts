import { faker } from "@faker-js/faker";
import type { ResultOf } from "@graphql-typed-document-node/core";
import type { Organization } from "@prisma/client";
import { mock } from "jest-mock-extended";
import { PermissionDeniedError } from "~/domain/errors.js";
import { Role } from "~/domain/organizations.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";
import type {
	AddMember2Document,
	RemoveMember2Document,
} from "~/graphql/test-clients/unit/graphql.js";

describe("OrganizationResolvers", () => {
	describe("Mutation", () => {
		describe("createOrganization", () => {
			it("calls createOrganization", async () => {
				/**
				 * Arrange
				 *
				 * 1. Create a mock ApolloServer
				 * 2. Create the mock context without a userId in session
				 */
				const { createMockContext, client, organizationService } =
					createMockApolloServer();
				const contextValue = createMockContext({
					user: { id: faker.string.uuid() },
				});
				organizationService.organizations.create.mockResolvedValueOnce(
					mock<Organization>({
						id: faker.string.uuid(),
						name: "test",
						createdAt: new Date(),
						updatedAt: new Date(),
						description: "",
					}),
				);

				/**
				 * Act
				 *
				 * 1. Query the server with the createOrganization mutation
				 */
				const { data, errors } = await client.mutate(
					{
						mutation: graphql(`
              mutation createOrganization {
                createOrganization(data: { name: "test" }) {
                  organization {
                    id
                    name
                  }
                }
              }
            `),
					},
					{
						contextValue,
					},
				);
				expect(errors).toBeUndefined();
				expect(data).toBeDefined();
				expect(data).toEqual({
					createOrganization: {
						organization: {
							id: expect.any(String),
							name: "test",
						},
					},
				});
			});
		});

		describe("updateOrganization", () => {
			it("calls updateOrganization", async () => {
				/**
				 * Arrange
				 *
				 * 1. Create a mock ApolloServer
				 * 2. Create the mock context without a userId in session
				 */
				const { createMockContext, client, organizationService } =
					createMockApolloServer();
				const contextValue = createMockContext({
					user: { id: faker.string.uuid() },
				});
				organizationService.organizations.update.mockResolvedValueOnce(
					mock<Organization>({
						id: faker.string.uuid(),
						name: "test",
						createdAt: new Date(),
						updatedAt: new Date(),
						description: "",
					}),
				);

				/**
				 * Act
				 *
				 * 1. Query the server with the createOrganization mutation
				 */
				const { data, errors } = await client.mutate(
					{
						mutation: graphql(`
              mutation updateOrganization2 {
                updateOrganization(data: { name: "test", id: "id" }) {
                  organization {
                    id
                    name
                  }
                }
              }
            `),
					},
					{
						contextValue,
					},
				);
				expect(errors).toBeUndefined();
				expect(data).toBeDefined();
				expect(data).toEqual({
					updateOrganization: {
						organization: {
							id: expect.any(String),
							name: "test",
						},
					},
				});
			});
		});

		describe("addMember", () => {
			it("calls addMember", async () => {
				/**
				 * Arrange
				 *
				 * 1. Create a mock ApolloServer
				 * 2. Create the mock context without a userId in session
				 */
				const { createMockContext, client, organizationService } =
					createMockApolloServer();
				const contextValue = createMockContext({
					user: { id: faker.string.uuid() },
				});
				organizationService.members.addMember.mockResolvedValueOnce({
					ok: true,
					data: {
						member: {
							id: faker.string.uuid(),
							createdAt: new Date(),
							updatedAt: new Date(),
							userId: faker.string.uuid(),
							organizationId: faker.string.uuid(),
							role: Role.MEMBER,
						},
					},
				});
				organizationService.organizations.get.mockResolvedValueOnce(
					mock<Organization>({
						id: faker.string.uuid(),
						createdAt: new Date(),
						updatedAt: new Date(),
						name: "test",
						description: "",
					}),
				);
				organizationService.members.findMany.mockResolvedValueOnce({
					ok: true,
					data: {
						members: [
							{
								id: faker.string.uuid(),
								createdAt: new Date(),
								updatedAt: new Date(),
								role: Role.MEMBER,
								userId: faker.string.uuid(),
								organizationId: faker.string.uuid(),
							},
						],
					},
				});

				/**
				 * Act
				 *
				 * 1. Query the server with the createOrganization mutation
				 */
				const { data, errors } = await client.mutate(
					{
						mutation: graphql(`
              mutation addMember2 {
                addMember(data: { userId: "user", organizationId: "org" }) {
                  member {
                    id
                    organization {
                      id
                      members {
                        id
                      }
                    }
                  }
                }
              }
            `),
					},
					{
						contextValue,
					},
				);
				expect(errors).toBeUndefined();
				expect(data).toBeDefined();
				expect(data).toEqual<ResultOf<typeof AddMember2Document>>({
					addMember: {
						member: {
							id: expect.any(String),
							organization: {
								id: expect.any(String),
								members: [
									{
										id: expect.any(String),
									},
								],
							},
						},
					},
				});
			});

			it("should raise error an error is returned", async () => {
				/**
				 * Arrange
				 *
				 * 1. Create a mock ApolloServer
				 * 2. Create the mock context without a userId in session
				 */
				const userId = faker.string.uuid();
				const { createMockContext, client, organizationService } =
					createMockApolloServer();
				const contextValue = createMockContext({ user: { id: userId } });
				organizationService.members.addMember.mockResolvedValueOnce({
					ok: false,
					error: new PermissionDeniedError("error"),
				});

				/**
				 * Act
				 *
				 * 1. Query the server with the createOrganization mutation
				 */
				const { data, errors } = await client.mutate(
					{
						mutation: graphql(`
			  mutation addMember2 {
				addMember(data: { userId: "user", organizationId: "org" }) {
				  member {
					id
					organization {
					  id
					  members {
						id
					  }
					}
				  }
				}
			  }
			`),
					},
					{
						contextValue,
					},
				);
				expect(errors).toBeDefined();
				expect(data).toBeUndefined();
			});
		});

		describe("removeMember", () => {
			it("should call removeMember", async () => {
				/**
				 * Arrange
				 *
				 * 1. Create a mock ApolloServer
				 * 2. Create the mock context without a userId in session
				 */
				const userId = faker.string.uuid();
				const { createMockContext, client, organizationService } =
					createMockApolloServer();
				const contextValue = createMockContext({ user: { id: userId } });
				organizationService.members.removeMember.mockResolvedValueOnce({
					ok: true,
					data: {
						member: {
							id: faker.string.uuid(),
							createdAt: new Date(),
							updatedAt: new Date(),
							userId: faker.string.uuid(),
							organizationId: faker.string.uuid(),
							role: Role.MEMBER,
						},
					},
				});
				organizationService.organizations.get.mockResolvedValueOnce(
					mock<Organization>({
						id: faker.string.uuid(),
						createdAt: new Date(),
						updatedAt: new Date(),
						name: "test",
						description: "",
					}),
				);
				organizationService.members.findMany.mockResolvedValueOnce({
					ok: true,
					data: {
						members: [
							{
								id: faker.string.uuid(),
								createdAt: new Date(),
								updatedAt: new Date(),
								role: Role.MEMBER,
								userId: faker.string.uuid(),
								organizationId: faker.string.uuid(),
							},
						],
					},
				});

				/**
				 * Act
				 *
				 * 1. Query the server with the createOrganization mutation
				 */
				const { data, errors } = await client.mutate(
					{
						mutation: graphql(`
              mutation removeMember2 {
                removeMember(data: { id: "id" }) {
                  member {
                    id
                    organization {
                      id
                      members {
                        id
                      }
                    }
                  }
                }
              }
            `),
					},
					{
						contextValue,
					},
				);
				expect(errors).toBeUndefined();
				expect(data).toBeDefined();
				expect(organizationService.members.removeMember).toHaveBeenCalledWith(
					expect.any(Object),
					{
						memberId: "id",
					},
				);
				expect(data).toEqual<ResultOf<typeof RemoveMember2Document>>({
					removeMember: {
						member: {
							id: expect.any(String),
							organization: {
								id: expect.any(String),
								members: [
									{
										id: expect.any(String),
									},
								],
							},
						},
					},
				});
			});

			it("should raise error an error is returned", async () => {
				/**
				 * Arrange
				 *
				 * 1. Create a mock ApolloServer
				 * 2. Create the mock context without a userId in session
				 */
				const userId = faker.string.uuid();
				const { createMockContext, client, organizationService } =
					createMockApolloServer();
				const contextValue = createMockContext({ user: { id: userId } });
				organizationService.members.removeMember.mockResolvedValueOnce({
					ok: false,
					error: new PermissionDeniedError("error"),
				});

				/**
				 * Act
				 *
				 * 1. Query the server with the createOrganization mutation
				 */
				const { data, errors } = await client.mutate(
					{
						mutation: graphql(`
			  mutation removeMember2 {
				removeMember(data: { id: "id" }) {
				  member {
					id
					organization {
					  id
					  members {
						id
					  }
					}
				  }
				}
			  }
			`),
					},
					{
						contextValue,
					},
				);
				expect(errors).toBeDefined();
				expect(data).toBeUndefined();
			});
		});
	});
});

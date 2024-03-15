import { ApolloServerErrorCode } from "@apollo/server/errors";
import { faker } from "@faker-js/faker";
import { NotFoundError, errorCodes } from "~/domain/errors.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";
import { Result } from "~/lib/result.js";

describe("Organization mutations", () => {
	describe("addMember", () => {
		it("returns GraphQL error if neither ID nor email is provided", async () => {
			const { client } = createMockApolloServer();

			const { errors } = await client.mutate({
				mutation: graphql(`
                    mutation AddMember($data: AddMemberInput!) {
                        addMember(data: $data) {
                            member {
                                id
                            }
                        }
                    }
                `),
				variables: {
					data: {
						organizationId: faker.string.uuid(),
						role: "MEMBER",
					},
				},
			});

			expect(errors).toHaveLength(1);
			expect(errors?.[0]?.extensions?.code).toBe(
				ApolloServerErrorCode.BAD_USER_INPUT,
			);
		});

		it("uses email if provided", async () => {
			const { client, organizationService } = createMockApolloServer();

			const email = faker.internet.email();
			await client.mutate({
				mutation: graphql(`
                    mutation AddMember($data: AddMemberInput!) {
                        addMember(data: $data) {
                            member {
                                id
                            }
                        }
                    }
                `),
				variables: {
					data: {
						organizationId: faker.string.uuid(),
						role: "MEMBER",
						email,
					},
				},
			});

			expect(organizationService.members.addMember).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					email,
				}),
			);
		});

		it("uses userId if provided", async () => {
			const { client, organizationService } = createMockApolloServer();

			const userId = faker.string.uuid();
			await client.mutate({
				mutation: graphql(`
                    mutation AddMember($data: AddMemberInput!) {
                        addMember(data: $data) {
                            member {
                                id
                            }
                        }
                    }
                `),
				variables: {
					data: {
						organizationId: faker.string.uuid(),
						role: "MEMBER",
						userId,
					},
				},
			});

			expect(organizationService.members.addMember).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					userId,
				}),
			);
		});

		it("throws if adding a member fails", async () => {
			const { client, organizationService } = createMockApolloServer();

			organizationService.members.addMember.mockResolvedValue(
				Result.error(new NotFoundError("")),
			);

			const userId = faker.string.uuid();
			const { errors } = await client.mutate({
				mutation: graphql(`
                    mutation AddMember($data: AddMemberInput!) {
                        addMember(data: $data) {
                            member {
                                id
                            }
                        }
                    }
                `),
				variables: {
					data: {
						organizationId: faker.string.uuid(),
						role: "MEMBER",
						userId,
					},
				},
			});

			expect(errors).toHaveLength(1);
			expect(errors?.[0]?.extensions?.code).toBe(errorCodes.ERR_NOT_FOUND);
		});
	});
});

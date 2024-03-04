import { faker } from "@faker-js/faker";
import type { EventSignUp } from "@prisma/client";
import { mock } from "jest-mock-extended";
import { InvalidArgumentError } from "~/domain/errors.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Event Mutations", () => {
	describe("removeSignUp", () => {
		it("calls events.removeSignUp with the provided data", async () => {
			const { client, createMockContext, eventService } =
				createMockApolloServer();

			const signUpId = faker.string.uuid();
			const userId = faker.string.uuid();
			eventService.removeSignUp.mockResolvedValue({
				ok: true,
				data: {
					signUp: mock<EventSignUp>({
						id: signUpId,
					}),
				},
			});

			const { data, errors } = await client.mutate(
				{
					mutation: graphql(`
                    mutation RemoveSignUp($data: RemoveSignUpInput!) {
                        removeSignUp(data: $data) {
                            signUp {
                                id
                            }
                        }
                    }
                `),
					variables: {
						data: {
							signUpId,
						},
					},
				},
				{
					contextValue: createMockContext({
						user: {
							id: userId,
						},
					}),
				},
			);

			expect(eventService.removeSignUp).toHaveBeenCalledWith(
				expect.objectContaining({
					user: expect.objectContaining({
						id: userId,
					}),
				}),
				expect.objectContaining({
					signUpId: signUpId,
				}),
			);
			expect(data).toEqual({
				removeSignUp: {
					signUp: {
						id: signUpId,
					},
				},
			});
			expect(errors).toBeUndefined();
		});

		it("throws if the removal fails", async () => {
			const { client, createMockContext, eventService } =
				createMockApolloServer();

			const signUpId = faker.string.uuid();
			const userId = faker.string.uuid();
			eventService.removeSignUp.mockResolvedValue({
				ok: false,
				error: new InvalidArgumentError(""),
			});

			const { errors } = await client.mutate(
				{
					mutation: graphql(`
                    mutation RemoveSignUp($data: RemoveSignUpInput!) {
                        removeSignUp(data: $data) {
                            signUp {
                                id
                            }
                        }
                    }
                `),
					variables: {
						data: {
							signUpId,
						},
					},
				},
				{
					contextValue: createMockContext({
						user: {
							id: userId,
						},
					}),
				},
			);

			expect(eventService.removeSignUp).toHaveBeenCalledWith(
				expect.objectContaining({
					user: expect.objectContaining({
						id: userId,
					}),
				}),
				expect.objectContaining({
					signUpId: signUpId,
				}),
			);
			expect(errors).toBeDefined();
		});
	});
});

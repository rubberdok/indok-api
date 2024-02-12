import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import type { CategoryType } from "~/domain/events/index.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Event mutations", () => {
	describe("#createEventCategory", () => {
		it("should create a new category", async () => {
			const { client, eventService, createMockContext } =
				createMockApolloServer();
			eventService.createCategory.mockResolvedValue(
				mock<CategoryType>({
					id: faker.string.uuid(),
					name: faker.string.sample(20),
				}),
			);

			const { errors } = await client.mutate(
				{
					mutation: graphql(`
                    mutation createEventCategory($data: CreateEventCategoryInput!) {
                        createEventCategory(data: $data) {
                            category {
                                id
                                name
                            }
                        }
                    }
                `),
					variables: {
						data: {
							name: faker.string.sample(20),
						},
					},
				},
				{
					contextValue: createMockContext({
						user: null,
					}),
				},
			);

			expect(errors).toBeUndefined();
			expect(eventService.createCategory).toHaveBeenCalledWith(
				expect.objectContaining({ user: null }),
				{ name: expect.any(String) },
			);
		});
	});
});

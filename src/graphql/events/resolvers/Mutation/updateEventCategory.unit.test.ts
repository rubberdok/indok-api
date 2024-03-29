import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import type { CategoryType } from "~/domain/events/index.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Event mutations", () => {
	describe("#updateEventCategory", () => {
		it("should update an existing category", async () => {
			const { client, eventService, createMockContext } =
				createMockApolloServer();
			eventService.updateCategory.mockResolvedValue(
				mock<CategoryType>({
					id: faker.string.uuid(),
					name: faker.string.sample(20),
				}),
			);

			const contextValue = createMockContext({
				user: {
					id: faker.string.uuid(),
				},
			});

			const { errors } = await client.mutate(
				{
					mutation: graphql(`
                    mutation updateEventCategory($data: UpdateEventCategoryInput!) {
                        updateEventCategory(data: $data) {
                            category {
                                id
                                name
                            }
                        }
                    }
                `),
					variables: {
						data: {
							id: faker.string.uuid(),
							name: faker.string.sample(20),
						},
					},
				},
				{
					contextValue,
				},
			);

			expect(errors).toBeUndefined();
			expect(eventService.updateCategory).toHaveBeenCalled();
			expect(eventService.updateCategory).toHaveBeenCalledWith(
				expect.objectContaining({ user: expect.any(Object) }),
				{ name: expect.any(String), id: expect.any(String) },
			);
		});
	});
});

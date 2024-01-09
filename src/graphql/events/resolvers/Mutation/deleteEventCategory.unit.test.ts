import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import type { Category } from "~/domain/events.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Event mutations", () => {
	describe("#deleteEventCategory", () => {
		it("should delete an existing category", async () => {
			const { client, eventService, createMockContext } =
				createMockApolloServer();
			eventService.deleteCategory.mockResolvedValue(
				mock<Category>({
					id: faker.string.uuid(),
					name: faker.string.sample(20),
				}),
			);

			const contextValue = createMockContext({
				userId: faker.string.uuid(),
			});

			const { errors } = await client.mutate(
				{
					mutation: graphql(`
                    mutation deleteEventCategory($data: DeleteEventCategoryInput!) {
                        deleteEventCategory(data: $data) {
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
						},
					},
				},
				{
					contextValue,
				},
			);

			expect(errors).toBeUndefined();
			expect(eventService.deleteCategory).toHaveBeenCalledWith(
				expect.objectContaining({ user: expect.any(Object) }),
				{ id: expect.any(String) },
			);
		});
	});
});

import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import { UnauthorizedError } from "~/domain/errors.js";
import type { OrderType } from "~/domain/products.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Product mutations", () => {
	describe("#createOrder", () => {
		it("should create an order", async () => {
			const { productService, client } = createMockApolloServer();
			productService.orders.create.mockResolvedValueOnce({
				ok: true,
				data: {
					order: mock<OrderType>({
						id: faker.string.uuid(),
					}),
				},
			});

			const { data, errors } = await client.mutate({
				mutation: graphql(`
                    mutation createOrder($data: CreateOrderInput!) {
                        createOrder(data: $data) {
                            order {
                                id
                            }
                        }
                    }
                `),
				variables: {
					data: {
						productId: faker.string.uuid(),
					},
				},
			});

			expect(errors).toBeUndefined();
			expect(data?.createOrder).toEqual({
				order: {
					id: expect.any(String),
				},
			});
		});

		it("should throw if ok: false", async () => {
			const { productService, client } = createMockApolloServer();
			productService.orders.create.mockResolvedValueOnce({
				ok: false,
				error: new UnauthorizedError("Some error"),
			});

			const { errors } = await client.mutate({
				mutation: graphql(`
                    mutation createOrder($data: CreateOrderInput!) {
                        createOrder(data: $data) {
                            order {
                                id
                            }
                        }
                    }
                `),
				variables: {
					data: {
						productId: faker.string.uuid(),
					},
				},
			});

			expect(errors).toBeDefined();
		});
	});
});

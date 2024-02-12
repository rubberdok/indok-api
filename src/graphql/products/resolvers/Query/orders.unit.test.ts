import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import { InternalServerError } from "~/domain/errors.js";
import type { OrderType, ProductType } from "~/domain/products.js";
import type { User } from "~/domain/users.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Product queries", () => {
	describe("#paymentAttempts", () => {
		it("should return a list of orders with product and user: null if not making the request as that user", async () => {
			const { productService, userService, client } = createMockApolloServer();
			const user = mock<User>({ id: faker.string.uuid() });
			productService.orders.findMany.mockResolvedValueOnce({
				ok: true,
				data: {
					orders: [
						mock<OrderType>({ id: faker.string.uuid(), userId: user.id }),
					],
					total: 1,
				},
			});
			productService.products.get.mockResolvedValueOnce({
				ok: true,
				data: {
					product: mock<ProductType>({ id: faker.string.uuid() }),
				},
			});
			userService.get.mockResolvedValueOnce(user);

			const { data, errors } = await client.query({
				query: graphql(`
                query orders {
                    orders {
                        orders {
                            id
                            product {
                                id
                            }
                            user {
                                id
                            }
                        }
                        total
                    }
                }
            `),
			});

			expect(errors).toBeUndefined();
			expect(data?.orders.orders).toEqual([
				{
					id: expect.any(String),
					product: { id: expect.any(String) },
					user: null,
				},
			]);
		});

		it("should return a list of orders with product and user if making the request as that user", async () => {
			const { productService, userService, client, createMockContext } =
				createMockApolloServer();
			const user = mock<User>({ id: faker.string.uuid() });
			productService.orders.findMany.mockResolvedValueOnce({
				ok: true,
				data: {
					orders: [
						mock<OrderType>({ id: faker.string.uuid(), userId: user.id }),
					],
					total: 1,
				},
			});
			productService.products.get.mockResolvedValueOnce({
				ok: true,
				data: {
					product: mock<ProductType>({ id: faker.string.uuid() }),
				},
			});
			userService.get.mockResolvedValueOnce(user);

			const { data, errors } = await client.query(
				{
					query: graphql(`
                query orders {
                    orders {
                        orders {
                            id
                            product {
                                id
                            }
                            user {
                                id
                            }
                        }
                        total
                    }
                }
            `),
				},
				{
					contextValue: createMockContext({ user }),
				},
			);

			expect(errors).toBeUndefined();
			expect(data?.orders.orders).toEqual([
				{
					id: expect.any(String),
					product: { id: expect.any(String) },
					user: { id: user.id },
				},
			]);
		});

		it("should throw if ok: false", async () => {
			const { productService, client } = createMockApolloServer();
			productService.orders.findMany.mockResolvedValueOnce({
				ok: false,
				error: new InternalServerError("Some error"),
			});

			const { errors } = await client.query({
				query: graphql(`
                query ordersShouldThrow {
                    orders {
                        orders {
                            id
                        }
                        total
                    }
                }
            `),
			});

			expect(errors).toBeDefined();
		});
	});
});

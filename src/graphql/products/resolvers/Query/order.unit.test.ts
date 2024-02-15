import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import { InternalServerError } from "~/domain/errors.js";
import { Order, PaymentAttempt, type ProductType } from "~/domain/products.js";
import type { User } from "~/domain/users.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Product queries", () => {
	describe("#order", () => {
		it("should return an order with product and user: null if not making the request as that user", async () => {
			const { productService, userService, client } = createMockApolloServer();
			const user = mock<User>({ id: faker.string.uuid() });
			productService.orders.get.mockResolvedValueOnce({
				ok: true,
				data: {
					order: new Order({
						id: faker.string.uuid(),
						userId: user.id,
						attempt: 1,
						createdAt: new Date(),
						paymentStatus: "CREATED",
						productId: faker.string.uuid(),
						purchasedAt: null,
						totalPrice: 100,
						updatedAt: new Date(),
						version: 1,
						capturedPaymentAttemptReference: null,
					}),
				},
			});
			productService.products.get.mockResolvedValueOnce({
				ok: true,
				data: {
					product: mock<ProductType>({ id: faker.string.uuid() }),
				},
			});
			productService.payments.get.mockResolvedValueOnce({
				ok: true,
				data: {
					paymentAttempt: new PaymentAttempt({
						id: faker.string.uuid(),
						createdAt: new Date(),
						reference: faker.string.uuid(),
						state: "AUTHORIZED",
						updatedAt: new Date(),
						version: 1,
						orderId: faker.string.uuid(),
					}),
				},
			});
			userService.get.mockResolvedValueOnce(user);

			const { data, errors } = await client.query({
				query: graphql(`
                query order($data: OrderInput!, $reference: String) {
                    order(data: $data) {
                        order {
                            id
                            product {
                                id
                            }
                            isFinalState
                            paymentAttempt(reference: $reference) {
                                id
                                isFinalState
                            }
                            user {
                                id
                            }
                        }
                    }
                }
            `),
				variables: {
					data: {
						id: faker.string.uuid(),
					},
					reference: faker.string.uuid(),
				},
			});

			expect(errors).toBeUndefined();
			expect(data?.order.order).toEqual({
				id: expect.any(String),
				product: { id: expect.any(String) },
				paymentAttempt: expect.objectContaining({
					id: expect.any(String),
					isFinalState: expect.any(Boolean),
				}),
				isFinalState: expect.any(Boolean),
				user: null,
			});
		});

		it("should return an order with product and user if making the request as that user", async () => {
			const { productService, userService, client, createMockContext } =
				createMockApolloServer();
			const user = mock<User>({ id: faker.string.uuid() });
			productService.orders.get.mockResolvedValueOnce({
				ok: true,
				data: {
					order: new Order({
						id: faker.string.uuid(),
						userId: user.id,
						attempt: 1,
						createdAt: new Date(),
						paymentStatus: "CREATED",
						productId: faker.string.uuid(),
						purchasedAt: null,
						totalPrice: 100,
						updatedAt: new Date(),
						version: 1,
						capturedPaymentAttemptReference: null,
					}),
				},
			});
			productService.products.get.mockResolvedValueOnce({
				ok: true,
				data: {
					product: mock<ProductType>({ id: faker.string.uuid() }),
				},
			});
			productService.payments.get.mockResolvedValueOnce({
				ok: true,
				data: {
					paymentAttempt: new PaymentAttempt({
						id: faker.string.uuid(),
						createdAt: new Date(),
						reference: faker.string.uuid(),
						state: "AUTHORIZED",
						updatedAt: new Date(),
						version: 1,
						orderId: faker.string.uuid(),
					}),
				},
			});
			userService.get.mockResolvedValueOnce(user);

			const { data, errors } = await client.query(
				{
					query: graphql(`
                query order($data: OrderInput!, $reference: String) {
                    order(data: $data) {
                        order {
                            id
                            product {
                                id
                            }
                            isFinalState
                            paymentAttempt(reference: $reference) {
                                id
                                isFinalState
                            }
                            user {
                                id
                            }
                        }
                    }
                }
            `),
					variables: {
						data: {
							id: faker.string.uuid(),
						},
						reference: faker.string.uuid(),
					},
				},
				{
					contextValue: createMockContext({ user }),
				},
			);

			expect(errors).toBeUndefined();
			expect(data?.order.order).toEqual({
				id: expect.any(String),
				product: { id: expect.any(String) },
				paymentAttempt: expect.objectContaining({
					id: expect.any(String),
					isFinalState: expect.any(Boolean),
				}),
				isFinalState: expect.any(Boolean),
				user: { id: user.id },
			});
		});

		it("should throw if ok: false", async () => {
			const { productService, client } = createMockApolloServer();
			productService.orders.get.mockResolvedValueOnce({
				ok: false,
				error: new InternalServerError("Some error"),
			});

			const { errors } = await client.query({
				query: graphql(`
                query orderShouldThrow($data: OrderInput!) {
                    order(data: $data) {
                        order {
                            id
                        }
                    }
                }
            `),
				variables: {
					data: {
						id: faker.string.uuid(),
					},
				},
			});

			expect(errors).toBeDefined();
		});
	});
});

import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import { InternalServerError } from "~/domain/errors.js";
import type { OrderType, PaymentAttemptType } from "~/domain/products.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Product queries", () => {
	describe("#paymentAttempts", () => {
		it("should return a list of paymentAttempts with orders", async () => {
			const { productService, client } = createMockApolloServer();
			productService.payments.findMany.mockResolvedValueOnce({
				ok: true,
				data: {
					paymentAttempts: [
						mock<PaymentAttemptType>({ id: faker.string.uuid() }),
					],
					total: 1,
				},
			});
			productService.orders.get.mockResolvedValueOnce({
				ok: true,
				data: {
					order: mock<OrderType>({ id: faker.string.uuid() }),
				},
			});

			const { data, errors } = await client.query({
				query: graphql(`
                query paymentAttempts {
                    paymentAttempts {
                        paymentAttempts {
                            id
                            order {
                                id
                            }
                        }
                        total
                    }
                }
            `),
			});

			expect(errors).toBeUndefined();
			expect(data?.paymentAttempts.paymentAttempts).toEqual([
				{ id: expect.any(String), order: { id: expect.any(String) } },
			]);
		});

		it("should return a list of paymentAttempts with orders", async () => {
			const { productService, client } = createMockApolloServer();
			productService.payments.findMany.mockResolvedValueOnce({
				ok: true,
				data: {
					paymentAttempts: [
						mock<PaymentAttemptType>({ id: faker.string.uuid() }),
					],
					total: 1,
				},
			});
			productService.orders.get.mockResolvedValueOnce({
				ok: true,
				data: {
					order: mock<OrderType>({ id: faker.string.uuid() }),
				},
			});

			const { data, errors } = await client.query({
				query: graphql(`
                query paymentAttempts {
                    paymentAttempts {
                        paymentAttempts {
                            id
                            order {
                                id
                            }
                        }
                        total
                    }
                }
            `),
			});

			expect(errors).toBeUndefined();
			expect(data?.paymentAttempts.paymentAttempts).toEqual([
				{ id: expect.any(String), order: { id: expect.any(String) } },
			]);
		});

		it("should throw if ok: false", async () => {
			const { productService, client } = createMockApolloServer();
			productService.payments.findMany.mockResolvedValueOnce({
				ok: false,
				error: new InternalServerError("Some error"),
			});

			const { errors } = await client.query({
				query: graphql(`
                query paymentAttempts {
                    paymentAttempts {
                        paymentAttempts {
                            id
                            order {
                                id
                            }
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

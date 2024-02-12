import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import { UnauthorizedError } from "~/domain/errors.js";
import type { MerchantType } from "~/domain/products.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Product mutations", () => {
	describe("#createMerchant", () => {
		it("should create a merchant", async () => {
			const { productService, client } = createMockApolloServer();
			productService.merchants.create.mockResolvedValueOnce({
				ok: true,
				data: {
					merchant: mock<MerchantType>({
						id: faker.string.uuid(),
						name: faker.word.adjective(),
					}),
				},
			});

			const { data, errors } = await client.mutate({
				mutation: graphql(`
                    mutation createMerchant($data: CreateMerchantInput!) {
                        createMerchant(data: $data) {
                            merchant {
                                id
                                name
                            }
                        }
                    }
                `),
				variables: {
					data: {
						clientId: faker.string.uuid(),
						clientSecret: faker.string.uuid(),
						subscriptionKey: faker.string.uuid(),
						serialNumber: faker.string.uuid(),
						name: faker.word.adjective(),
					},
				},
			});

			expect(errors).toBeUndefined();
			expect(data?.createMerchant.merchant).toEqual({
				id: expect.any(String),
				name: expect.any(String),
			});
		});

		it("should throw if ok: false", async () => {
			const { productService, client } = createMockApolloServer();
			productService.merchants.create.mockResolvedValueOnce({
				ok: false,
				error: new UnauthorizedError("Some error"),
			});

			const { errors } = await client.mutate({
				mutation: graphql(`
                    mutation createMerchant($data: CreateMerchantInput!) {
                        createMerchant(data: $data) {
                            merchant {
                                id
                                name
                            }
                        }
                    }
                `),
				variables: {
					data: {
						clientId: faker.string.uuid(),
						clientSecret: faker.string.uuid(),
						subscriptionKey: faker.string.uuid(),
						serialNumber: faker.string.uuid(),
						name: faker.word.adjective(),
					},
				},
			});

			expect(errors).toBeDefined();
		});
	});
});

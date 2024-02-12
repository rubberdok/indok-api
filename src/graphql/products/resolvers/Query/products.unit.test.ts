import { InternalServerError } from "~/domain/errors.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Product queries", () => {
	describe("#products", () => {
		it("should return a list of products", async () => {
			const { productService, client } = createMockApolloServer();
			productService.products.findMany.mockResolvedValueOnce({
				ok: true,
				data: {
					products: [],
					total: 0,
				},
			});

			const { data, errors } = await client.query({
				query: graphql(`
                query products {
                    products {
                        products {
                            id
                        }
                        total
                    }
                }
            `),
			});

			expect(errors).toBeUndefined();
			expect(data?.products).toEqual({
				products: [],
				total: 0,
			});
		});

		it("should throw if ok: false", async () => {
			const { productService, client } = createMockApolloServer();
			productService.products.findMany.mockResolvedValueOnce({
				ok: false,
				error: new InternalServerError("Some error"),
			});

			const { errors } = await client.query({
				query: graphql(`
                query products {
                    products {
                        products {
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

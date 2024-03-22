import { UnauthorizedError, errorCodes } from "~/domain/errors.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";
import { Result } from "~/lib/result.js";

describe("Product queries", () => {
	it("returns all merchants", async () => {
		const { client, productService } = createMockApolloServer();

		productService.merchants.findMany.mockResolvedValue(
			Result.success({
				merchants: [],
				total: 0,
			}),
		);

		const { data } = await client.query({
			query: graphql(`
                query Merchants {
                    merchants {
                        merchants {
                            id
                        }
                        total
                    }
                }
            `),
		});

		expect(data).toEqual({
			merchants: {
				merchants: [],
				total: 0,
			},
		});
	});

	it("throws if it encounters an error", async () => {
		const { client, productService } = createMockApolloServer();

		productService.merchants.findMany.mockResolvedValue(
			Result.error(new UnauthorizedError("")),
		);

		const { errors } = await client.query({
			query: graphql(`
                query Merchants {
                    merchants {
                        merchants {
                            id
                        }
                        total
                    }
                }
            `),
		});

		expect(errors).toBeDefined();
		expect(errors).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					extensions: expect.objectContaining({
						code: errorCodes.ERR_UNAUTHORIZED,
					}),
				}),
			]),
		);
	});
});

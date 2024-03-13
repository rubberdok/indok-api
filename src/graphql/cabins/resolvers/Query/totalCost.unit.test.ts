import { faker } from "@faker-js/faker";
import { InvalidArgumentError } from "~/domain/errors.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Cabin Queries", () => {
	describe("#totalCost", () => {
		it("should resolve the total cost of a booking", async () => {
			const { client, cabinService } = createMockApolloServer();
			cabinService.totalCost.mockResolvedValue({
				ok: true,
				data: { totalCost: 1000 },
			});

			const { errors } = await client.query({
				query: graphql(`
                    query totalCost($data: TotalCostInput!) {
                        totalCost(data: $data) {
                            totalCost
                        }  
                    }
                `),
				variables: {
					data: {
						cabins: [{ id: faker.string.uuid() }],
						endDate: faker.date.recent().toISOString(),
						guests: {
							internal: 5,
							external: 10,
						},
						startDate: faker.date.recent().toISOString(),
					},
				},
			});

			expect(errors).toBeUndefined();
			expect(cabinService.totalCost).toHaveBeenCalledWith(expect.anything(), {
				cabins: [{ id: expect.any(String) }],
				endDate: expect.any(Date),
				guests: {
					internal: 5,
					external: 10,
				},
				startDate: expect.any(Date),
			});
		});

		it("should return error if something goes wrong", async () => {
			const { client, cabinService } = createMockApolloServer();
			cabinService.totalCost.mockResolvedValue({
				ok: false,
				error: new InvalidArgumentError(""),
			});

			const { errors } = await client.query({
				query: graphql(`
                    query totalCost($data: TotalCostInput!) {
                        totalCost(data: $data) {
                            totalCost
                        }  
                    }
                `),
				variables: {
					data: {
						cabins: [{ id: faker.string.uuid() }],
						endDate: faker.date.recent().toISOString(),
						guests: {
							internal: 5,
							external: 10,
						},
						startDate: faker.date.recent().toISOString(),
					},
				},
			});

			expect(errors).toBeDefined();
		});
	});
});

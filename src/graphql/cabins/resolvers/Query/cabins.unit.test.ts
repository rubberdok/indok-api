import { faker } from "@faker-js/faker";
import type { Cabin } from "@prisma/client";
import { mock } from "jest-mock-extended";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("query { cabins } ", () => {
	it("returns all cabins", async () => {
		const { client, cabinService } = createMockApolloServer();
		cabinService.findManyCabins.mockResolvedValue([
			mock<Cabin>({
				id: faker.string.uuid(),
				name: "Oksen",
			}),
			mock<Cabin>({
				id: faker.string.uuid(),
				name: "Bjørnen",
			}),
		]);

		const { errors } = await client.query({
			query: graphql(`
          query cabins {
            cabins {
              cabins {
                id
                name
              }
            }
          }
        `),
		});

		expect(errors).toBeUndefined();
		expect(cabinService.findManyCabins).toHaveBeenCalled();
	});

	it("{ price } resolves price ", async () => {
		const { client, cabinService } = createMockApolloServer();
		cabinService.findManyCabins.mockResolvedValue([
			{
				id: faker.string.uuid(),
				name: "Oksen",
				capacity: 10,
				createdAt: new Date(),
				updatedAt: new Date(),
				externalPrice: 1000,
				externalPriceWeekend: 2000,
				internalPrice: 500,
				internalPriceWeekend: 750,
			},
		]);

		const { errors } = await client.query({
			query: graphql(`
          query CabinsPrice {
            cabins {
              cabins {
                id
                name
				price {
					external {
						weekend
						weekend
					}
					internal {
						weekend
						weekday
					}
				}
              }
            }
          }
        `),
		});

		expect(errors).toBeUndefined();
		expect(cabinService.findManyCabins).toHaveBeenCalled();
	});
});

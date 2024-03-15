import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import { Cabin } from "~/domain/cabins.js";
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
			new Cabin({
				id: faker.string.uuid(),
				name: "Oksen",
				capacity: 10,
				externalPrice: 1000,
				externalPriceWeekend: 2000,
				internalPrice: 500,
				internalPriceWeekend: 750,
				createdAt: new Date(),
			}),
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

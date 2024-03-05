import { faker } from "@faker-js/faker";
import type { Cabin } from "@prisma/client";
import { mock } from "jest-mock-extended";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Cabin queries", () => {
	describe("cabins", () => {
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

		it("resolves occupied days for the cabins", async () => {
			const { client, cabinService } = createMockApolloServer();
			const oksen = mock<Cabin>({
				id: faker.string.uuid(),
				name: "Oksen",
			});
			const bjørnen = mock<Cabin>({
				id: faker.string.uuid(),
				name: "Bjørnen",
			});
			cabinService.findManyCabins.mockResolvedValue([oksen, bjørnen]);
			cabinService.getOccupiedDates.mockResolvedValue({
				ok: true,
				data: {
					days: [],
				},
			});

			const { errors } = await client.query({
				query: graphql(`
          query CabinsOccupiedDays {
            cabins {
              cabins {
                id
                name
				occupiedDays
              }
            }
          }
        `),
			});

			expect(errors).toBeUndefined();
			expect(cabinService.findManyCabins).toHaveBeenCalled();
			expect(cabinService.getOccupiedDates).toHaveBeenCalledWith(
				expect.anything(),
				{ cabinId: oksen.id },
			);
			expect(cabinService.getOccupiedDates).toHaveBeenCalledWith(
				expect.anything(),
				{ cabinId: bjørnen.id },
			);
		});
	});
});

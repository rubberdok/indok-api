import { faker } from "@faker-js/faker";
import { Cabin } from "@prisma/client";
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
	});
});

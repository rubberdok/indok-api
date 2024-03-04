import { faker } from "@faker-js/faker";
import type { Listing, Organization } from "@prisma/client";
import { mock } from "jest-mock-extended";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Listing queries", () => {
	describe("listing", () => {
		it("should return an listing", async () => {
			const { client, listingService } = createMockApolloServer();
			listingService.get.mockResolvedValue(
				mock<Listing>({ id: faker.string.uuid() }),
			);

			const { errors } = await client.query({
				query: graphql(`
          query listing($data: ListingInput!) {
            listing(data: $data) {
              listing {
                id
              }
            }
          }
        `),
				variables: {
					data: { id: faker.string.uuid() },
				},
			});

			expect(errors).toBeUndefined();
			expect(listingService.get).toHaveBeenCalledWith(expect.any(String));
		});

		it("should resolve additional attributes", async () => {
			const { client, listingService, organizationService } =
				createMockApolloServer();
			listingService.get.mockResolvedValue(
				mock<Listing>({
					id: faker.string.uuid(),
					organizationId: faker.string.uuid(),
				}),
			);
			organizationService.organizations.get.mockResolvedValue(
				mock<Organization>({ id: faker.string.uuid() }),
			);

			const { errors, data } = await client.query({
				query: graphql(`
          query listingWithOrganization($data: ListingInput!) {
            listing(data: $data) {
              listing {
                id
                organization {
                  id
                }
              }
            }
          }
        `),
				variables: {
					data: { id: faker.string.uuid() },
				},
			});

			expect(errors).toBeUndefined();
			expect(data?.listing.listing).toEqual({
				id: expect.any(String),
				organization: {
					id: expect.any(String),
				},
			});
		});
	});
});

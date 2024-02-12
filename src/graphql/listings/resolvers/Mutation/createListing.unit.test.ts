import { faker } from "@faker-js/faker";
import type { Listing } from "@prisma/client";
import { mock } from "jest-mock-extended";
import { errorCodes } from "~/domain/errors.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Listing mutations", () => {
	describe("createListing", () => {
		it("should attempt to create a listing", async () => {
			const { client, listingService, createMockContext } =
				createMockApolloServer();
			const authenticatedContext = createMockContext({
				user: { id: faker.string.uuid() },
			});
			listingService.create.mockResolvedValue(
				mock<Listing>({ id: faker.string.uuid() }),
			);

			const { errors } = await client.mutate(
				{
					mutation: graphql(`
            mutation createListing($data: CreateListingInput!) {
              createListing(data: $data) {
                listing {
                  id
                }
              }
            }
          `),
					variables: {
						data: {
							organizationId: faker.string.uuid(),
							name: faker.lorem.sentence(),
							closesAt: faker.date.future().toISOString(),
						},
					},
				},
				{ contextValue: authenticatedContext },
			);

			expect(errors).toBeUndefined();
			expect(listingService.create).toHaveBeenCalledWith(
				authenticatedContext.user?.id,
				{
					closesAt: expect.any(Date),
					name: expect.any(String),
					organizationId: expect.any(String),
				},
			);
		});

		it("should raise permission denied if not authenticated", async () => {
			const { client, listingService, createMockContext } =
				createMockApolloServer();
			const unauthenticatedContext = createMockContext({
				user: null,
			});

			const { errors } = await client.mutate(
				{
					mutation: graphql(`
            mutation createListing($data: CreateListingInput!) {
              createListing(data: $data) {
                listing {
                  id
                }
              }
            }
          `),
					variables: {
						data: {
							organizationId: faker.string.uuid(),
							name: faker.lorem.sentence(),
							closesAt: faker.date.future().toISOString(),
						},
					},
				},
				{ contextValue: unauthenticatedContext },
			);

			expect(errors).toBeDefined();
			expect(
				errors?.some(
					(err) => err.extensions?.code === errorCodes.ERR_PERMISSION_DENIED,
				),
			).toBe(true);
			expect(listingService.create).not.toHaveBeenCalled();
		});
	});
});

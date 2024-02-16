import { faker } from "@faker-js/faker";
import type { Organization } from "@prisma/client";
import { mock } from "jest-mock-extended";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Organization Queries", () => {
	describe("organization", () => {
		it("{ organization { events, listings } } should resolve lisitngs and events for the organization", async () => {
			const { client, eventService, listingService, organizationService } =
				createMockApolloServer();

			/**
			 * Arrange
			 *
			 * Set up mocks for the organization service
			 */
			const organizationId = faker.string.uuid();
			organizationService.get.mockResolvedValue(
				mock<Organization>({ id: organizationId }),
			);

			/**
			 * Act
			 */
			const actual = await client.query({
				query: graphql(`
                    query organization($data: OrganizationInput!) {
                        organization(data: $data) {
                            organization {
                                events {
                                    id
                                }
                                listings {
                                    id
                                }
                            }
                        }
                    }
                `),
				variables: {
					data: {
						id: organizationId,
					},
				},
			});

			/**
			 * Assert
			 */
			expect(actual).toBeDefined();
			expect(listingService.findMany).toHaveBeenCalledWith({ organizationId });
			expect(eventService.findMany).toHaveBeenCalledWith({ organizationId });
		});
	});
});

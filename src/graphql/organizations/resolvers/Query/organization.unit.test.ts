import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import { UnauthorizedError } from "~/domain/errors.js";
import type {
	Organization,
	OrganizationMember,
} from "~/domain/organizations.js";
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
			organizationService.organizations.get.mockResolvedValue(
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

		it("{ organization { members } } should return null if it encounters and error", async () => {
			const { client, organizationService } = createMockApolloServer();

			/**
			 * Arrange
			 *
			 * Set up mocks for the organization service
			 */
			organizationService.organizations.get.mockResolvedValue(
				mock<Organization>({ id: faker.string.uuid() }),
			);
			organizationService.members.findMany.mockResolvedValue({
				ok: false,
				error: new UnauthorizedError(""),
			});

			/**
			 * Act
			 */
			const { data, errors } = await client.query({
				query: graphql(`
					query organizationWithMembers($data: OrganizationInput!) {
						organization(data: $data) {
							organization {
								members {
									id
								}
							}
						}
					}
				`),
				variables: {
					data: {
						id: faker.string.uuid(),
					},
				},
			});

			/**
			 * Assert
			 */
			expect(errors).toBeUndefined();
			expect(data?.organization.organization.members).toBeNull();
		});

		it("{ organization { members } } should return members", async () => {
			const { client, organizationService } = createMockApolloServer();

			/**
			 * Arrange
			 *
			 * Set up mocks for the organization service
			 */
			organizationService.organizations.get.mockResolvedValue(
				mock<Organization>({ id: faker.string.uuid() }),
			);
			organizationService.members.findMany.mockResolvedValue({
				ok: true,
				data: {
					members: [mock<OrganizationMember>({ id: faker.string.uuid() })],
				},
			});

			/**
			 * Act
			 */
			const { data, errors } = await client.query({
				query: graphql(`
					query organizationWithMembers($data: OrganizationInput!) {
						organization(data: $data) {
							organization {
								members {
									id
								}
							}
						}
					}
				`),
				variables: {
					data: {
						id: faker.string.uuid(),
					},
				},
			});

			/**
			 * Assert
			 */
			expect(errors).toBeUndefined();
			expect(data?.organization.organization.members).toEqual([
				expect.objectContaining({ id: expect.any(String) }),
			]);
		});

		it("{ organization { logo { url } } } returns logo with url", async () => {
			const { client, organizationService, fileService } =
				createMockApolloServer();

			/**
			 * Arrange
			 *
			 * Set up mocks for the organization service
			 */
			organizationService.organizations.get.mockResolvedValue(
				mock<Organization>({
					id: faker.string.uuid(),
					logoFileId: faker.string.uuid(),
				}),
			);
			fileService.getFile.mockResolvedValue({
				ok: true,
				data: {
					file: {
						id: faker.string.uuid(),
						userId: faker.string.uuid(),
						name: faker.system.fileName(),
					},
				},
			});
			fileService.createFileDownloadUrl.mockResolvedValue({
				ok: true,
				data: {
					file: {
						id: faker.string.uuid(),
						userId: faker.string.uuid(),
						name: faker.system.fileName(),
					},
					url: faker.internet.url(),
				},
			});

			/**
			 * Act
			 */
			const { data, errors } = await client.query({
				query: graphql(`
					query OrganizationWithLogo($data: OrganizationInput!) {
						organization(data: $data) {
							organization {
								logo {
									url
								}
							}
						}
					}
				`),
				variables: {
					data: {
						id: faker.string.uuid(),
					},
				},
			});

			/**
			 * Assert
			 */
			expect(errors).toBeUndefined();
			expect(data?.organization.organization.logo?.url).toEqual(
				expect.any(String),
			);
		});

		it("{ organization { logo { url } } } returns null if file id is null", async () => {
			const { client, organizationService } = createMockApolloServer();

			/**
			 * Arrange
			 *
			 * Set up mocks for the organization service
			 */
			organizationService.organizations.get.mockResolvedValue(
				mock<Organization>({
					id: faker.string.uuid(),
					logoFileId: null,
				}),
			);

			/**
			 * Act
			 */
			const { data, errors } = await client.query({
				query: graphql(`
					query OrganizationWithLogo($data: OrganizationInput!) {
						organization(data: $data) {
							organization {
								logo {
									url
								}
							}
						}
					}
				`),
				variables: {
					data: {
						id: faker.string.uuid(),
					},
				},
			});

			/**
			 * Assert
			 */
			expect(errors).toBeUndefined();
			expect(data?.organization.organization.logo).toBeNull();
		});
	});
});

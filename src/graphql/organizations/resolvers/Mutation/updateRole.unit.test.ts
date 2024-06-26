import { faker } from "@faker-js/faker";
import { InternalServerError } from "~/domain/errors.js";
import {
	OrganizationMember,
	OrganizationRole,
} from "~/domain/organizations.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";
import { Result } from "~/lib/result.js";

describe("Organiation mutations", () => {
	describe("updateRole", () => {
		it("updates a role", async () => {
			const { client, organizationService } = createMockApolloServer();

			organizationService.members.updateRole.mockResolvedValue({
				ok: true,
				data: {
					member: new OrganizationMember({
						id: faker.string.uuid(),
						role: OrganizationRole.ADMIN,
						organizationId: faker.string.uuid(),
						userId: faker.string.uuid(),
					}),
				},
			});

			const { errors, data } = await client.mutate({
				mutation: graphql(`
        mutation UpdateRole($data: UpdateRoleInput!) {
          updateRole(data: $data) {
            member {
              id
            }
          }
        }
          `),
				variables: {
					data: {
						memberId: faker.string.uuid(),
						role: OrganizationRole.ADMIN,
					},
				},
			});

			expect(errors).toBeUndefined();
			expect(data).toEqual({
				updateRole: {
					member: {
						id: expect.any(String),
					},
				},
			});
		});

		it("throws on error", async () => {
			const { client, organizationService } = createMockApolloServer();

			organizationService.members.updateRole.mockResolvedValue(
				Result.error(new InternalServerError("")),
			);

			const { errors } = await client.mutate({
				mutation: graphql(`
        mutation UpdateRole($data: UpdateRoleInput!) {
          updateRole(data: $data) {
            member {
              id
            }
          }
        }
          `),
				variables: {
					data: {
						memberId: faker.string.uuid(),
						role: OrganizationRole.ADMIN,
					},
				},
			});

			expect(errors).toBeDefined();
		});
	});
});

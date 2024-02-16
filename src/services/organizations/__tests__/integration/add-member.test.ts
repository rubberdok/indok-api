import { makeTestServices } from "~/__tests__/dependencies-factory.js";
import { faker } from "@faker-js/faker";
import { makeMockContext } from "~/lib/context.js";
import { PermissionDeniedError, UnauthorizedError } from "~/domain/errors.js";

describe("OrganizationService", () => {
	describe("#addMember", () => {
		it("should remove a member from an organization", async () => {
			const { user, userNotInOrganization, organization, organizationService } =
				await makeDeps();

			const result = await organizationService.addMember(
				makeMockContext(user),
				{
					userId: userNotInOrganization.id,
					organizationId: organization.id,
					role: "MEMBER",
				},
			);
			expect(result).toEqual({
				ok: true,
				data: {
					member: expect.objectContaining({
						userId: userNotInOrganization.id,
						organizationId: organization.id,
						id: expect.any(String),
						role: "MEMBER",
					}),
				},
			});
		});

		it("should return ok: false and unauthorized error if not logged in", async () => {
			const { userNotInOrganization, organization, organizationService } =
				await makeDeps();

			const result = await organizationService.addMember(
				makeMockContext(null),
				{
					userId: userNotInOrganization.id,
					organizationId: organization.id,
					role: "MEMBER",
				},
			);
			expect(result).toEqual({
				ok: false,
				error: expect.any(UnauthorizedError),
			});
		});

		it("should return ok: false and permission denied error not a member of the organization", async () => {
			const { userNotInOrganization, organization, organizationService } =
				await makeDeps();

			const result = await organizationService.addMember(
				makeMockContext(userNotInOrganization),
				{
					userId: userNotInOrganization.id,
					organizationId: organization.id,
					role: "MEMBER",
				},
			);
			expect(result).toEqual({
				ok: false,
				error: expect.any(PermissionDeniedError),
			});
		});

		it("should return ok: false and permission denied error if not an admin in the organization", async () => {
			const {
				user,
				userNotInOrganization,
				userNotInOrganization2,
				organization,
				organizationService,
			} = await makeDeps();

			const addMemberResult = await organizationService.addMember(
				makeMockContext(user),
				{
					userId: userNotInOrganization.id,
					organizationId: organization.id,
					role: "MEMBER",
				},
			);
			if (!addMemberResult.ok) throw addMemberResult.error;

			const result = await organizationService.addMember(
				makeMockContext(userNotInOrganization),
				{
					userId: userNotInOrganization2.id,
					organizationId: organization.id,
					role: "MEMBER",
				},
			);
			expect(result).toEqual({
				ok: false,
				error: expect.any(PermissionDeniedError),
			});
		});
	});
});

async function makeDeps() {
	const deps = makeTestServices();
	const organizationService = deps.organizations;
	const userService = deps.users;
	function makeUser() {
		return userService.create({
			email: faker.internet.email({ firstName: faker.string.uuid() }),
			feideId: faker.string.uuid(),
			firstName: faker.person.firstName(),
			lastName: faker.person.lastName(),
			username: faker.string.uuid(),
		});
	}

	const user = await makeUser();
	const userNotInOrganization = await makeUser();
	const userNotInOrganization2 = await makeUser();

	const organization = await organizationService.create(user.id, {
		name: faker.string.uuid(),
	});

	return {
		organizationService,
		user,
		userService,
		organization,
		userNotInOrganization,
		userNotInOrganization2,
	};
}

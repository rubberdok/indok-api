import assert from "node:assert";
import { faker } from "@faker-js/faker";
import { makeTestServices } from "~/__tests__/dependencies-factory.js";
import {
	InvalidArgumentError,
	InvalidArgumentErrorV2,
	NotFoundError,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
import {
	OrganizationMember,
	OrganizationRole,
} from "~/domain/organizations.js";
import { makeMockContext } from "~/lib/context.js";
import { Result } from "~/lib/result.js";

describe("OrganizationService", () => {
	describe("#removeMember", () => {
		it("should remove a member from an organization", async () => {
			const { adminUser, memberUserMembership, organizationService } =
				await makeDeps();

			const result = await organizationService.members.removeMember(
				makeMockContext(adminUser),
				{
					memberId: memberUserMembership.id,
				},
			);
			expect(result).toEqual({
				ok: true,
				data: {
					member: memberUserMembership,
				},
			});
		});

		it("should return ok: false and unauthorized error if not logged in", async () => {
			const { memberUserMembership, organizationService } = await makeDeps();

			const result = await organizationService.members.removeMember(
				makeMockContext(null),
				{
					memberId: memberUserMembership.id,
				},
			);
			expect(result).toEqual({
				ok: false,
				error: expect.any(UnauthorizedError),
			});
		});

		it("should return ok: false and permission denied error not a member of the organization", async () => {
			const {
				memberUserMembership,
				notInOrganizationUser,
				organizationService,
			} = await makeDeps();

			const result = await organizationService.members.removeMember(
				makeMockContext(notInOrganizationUser),
				{
					memberId: memberUserMembership.id,
				},
			);
			expect(result).toEqual({
				ok: false,
				error: expect.any(PermissionDeniedError),
			});
		});

		it("should return ok: false and permission denied error if not an admin in the organization", async () => {
			const {
				adminUser,
				memberUser,
				notInOrganizationUser,
				organization,
				organizationService,
			} = await makeDeps();

			const addMemberResult = await organizationService.members.addMember(
				makeMockContext(adminUser),
				{
					userId: notInOrganizationUser.id,
					organizationId: organization.id,
					role: "MEMBER",
				},
			);
			if (!addMemberResult.ok) throw addMemberResult.error;

			const result = await organizationService.members.removeMember(
				makeMockContext(memberUser),
				{
					memberId: addMemberResult.data.member.id,
				},
			);
			expect(result).toEqual({
				ok: false,
				error: expect.any(PermissionDeniedError),
			});
		});

		it("should return ok: true and membership if removing yourself as a member", async () => {
			const { memberUser, memberUserMembership, organizationService } =
				await makeDeps();

			const result = await organizationService.members.removeMember(
				makeMockContext(memberUser),
				{
					memberId: memberUserMembership.id,
				},
			);

			expect(result).toEqual({
				ok: true,
				data: {
					member: memberUserMembership,
				},
			});
		});

		it("should return ok: false and invalid argument error if removing yourself as the last admin", async () => {
			const { adminUser, adminUserMembership, organizationService } =
				await makeDeps();

			const result = await organizationService.members.removeMember(
				makeMockContext(adminUser),
				{
					memberId: adminUserMembership.id,
				},
			);
			expect(result).toEqual({
				ok: false,
				error: expect.any(InvalidArgumentError),
			});
		});

		it("should return ok: true and remove the membership if removing yourself as an admin, with other admins remaining", async () => {
			const {
				adminUser,
				adminUserMembership,
				organizationService,
				notInOrganizationUser,
			} = await makeDeps();

			const addMemberResult = await organizationService.members.addMember(
				makeMockContext(adminUser),
				{
					userId: notInOrganizationUser.id,
					organizationId: adminUserMembership.organizationId,
					role: "ADMIN",
				},
			);
			if (!addMemberResult.ok) throw addMemberResult.error;

			const result = await organizationService.members.removeMember(
				makeMockContext(adminUser),
				{
					memberId: adminUserMembership.id,
				},
			);
			expect(result).toEqual({
				ok: true,
				data: {
					member: adminUserMembership,
				},
			});
		});
	});

	describe("#updateRole", () => {
		it("returns UnauthorizedError if not logged in", async () => {
			const { organizationService } = await makeDeps();

			const result = await organizationService.members.updateRole(
				makeMockContext(null),
				{
					memberId: faker.string.uuid(),
					newRole: OrganizationRole.ADMIN,
				},
			);

			expect(result).toEqual(Result.error(expect.any(UnauthorizedError)));
		});

		it("returns PermissionDeniedError if the user is not an admin in the organization", async () => {
			const { memberUser, organizationService, adminUserMembership } =
				await makeDeps();

			const result = await organizationService.members.updateRole(
				makeMockContext(memberUser),
				{
					memberId: adminUserMembership.id,
					newRole: OrganizationRole.ADMIN,
				},
			);

			expect(result).toEqual(Result.error(expect.any(PermissionDeniedError)));
		});

		it("returns InvalidArgumentError if the user tries to change their own role", async () => {
			const { adminUser, organizationService, adminUserMembership } =
				await makeDeps();

			const result = await organizationService.members.updateRole(
				makeMockContext(adminUser),
				{
					memberId: adminUserMembership.id,
					newRole: OrganizationRole.ADMIN,
				},
			);

			expect(result).toEqual(Result.error(expect.any(InvalidArgumentErrorV2)));
		});

		it("returns NotFoundError if the member does not exist", async () => {
			const { adminUser, organizationService } = await makeDeps();

			const result = await organizationService.members.updateRole(
				makeMockContext(adminUser),
				{
					memberId: faker.string.uuid(),
					newRole: OrganizationRole.ADMIN,
				},
			);

			expect(result).toEqual(Result.error(expect.any(NotFoundError)));
		});

		it("changes the role of the member", async () => {
			const { adminUser, organizationService, memberUserMembership } =
				await makeDeps();

			const result = await organizationService.members.updateRole(
				makeMockContext(adminUser),
				{
					memberId: memberUserMembership.id,
					newRole: OrganizationRole.ADMIN,
				},
			);

			expect(result).toEqual(
				Result.success({
					member: {
						...memberUserMembership,
						role: OrganizationRole.ADMIN,
					},
				}),
			);
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

	const adminUser = await makeUser();
	const memberUser = await makeUser();
	const notInOrganizationUser = await makeUser();

	const organization = await organizationService.organizations.create(
		makeMockContext(adminUser),
		{
			name: faker.string.uuid(),
		},
	);

	const res = await organizationService.members.addMember(
		makeMockContext(adminUser),
		{
			userId: memberUser.id,
			organizationId: organization.id,
			role: "MEMBER",
		},
	);
	if (!res.ok) throw res.error;

	const members = await organizationService.members.findMany(
		makeMockContext(adminUser),
		{ organizationId: organization.id },
	);
	if (!members.ok) throw members.error;

	const adminUserMembership = members.data.members.find(
		(m) => m.userId === adminUser.id,
	);
	assert(adminUserMembership);

	return {
		organizationService,
		adminUser,
		adminUserMembership: new OrganizationMember(adminUserMembership),
		userService,
		organization,
		memberUser,
		memberUserMembership: new OrganizationMember(res.data.member),
		notInOrganizationUser,
	};
}

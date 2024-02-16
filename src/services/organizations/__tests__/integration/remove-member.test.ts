import assert from "assert";
import { faker } from "@faker-js/faker";
import { makeTestServices } from "~/__tests__/dependencies-factory.js";
import {
	InvalidArgumentError,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
import { makeMockContext } from "~/lib/context.js";

describe("OrganizationService", () => {
	describe("#removeMember", () => {
		it("should remove a member from an organization", async () => {
			const {
				adminUser,
				memberUserMembership,
				organization,
				organizationService,
			} = await makeDeps();

			const result = await organizationService.removeMember(
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

			const result = await organizationService.removeMember(
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

			const result = await organizationService.removeMember(
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

			const addMemberResult = await organizationService.addMember(
				makeMockContext(adminUser),
				{
					userId: notInOrganizationUser.id,
					organizationId: organization.id,
					role: "MEMBER",
				},
			);
			if (!addMemberResult.ok) throw addMemberResult.error;

			const result = await organizationService.removeMember(
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

			const result = await organizationService.removeMember(
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

			const result = await organizationService.removeMember(
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

			const addMemberResult = await organizationService.addMember(
				makeMockContext(adminUser),
				{
					userId: notInOrganizationUser.id,
					organizationId: adminUserMembership.organizationId,
					role: "ADMIN",
				},
			);
			if (!addMemberResult.ok) throw addMemberResult.error;

			const result = await organizationService.removeMember(
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

	const organization = await organizationService.create(adminUser.id, {
		name: faker.string.uuid(),
	});

	const res = await organizationService.addMember(makeMockContext(adminUser), {
		userId: memberUser.id,
		organizationId: organization.id,
		role: "MEMBER",
	});
	if (!res.ok) throw res.error;

	const members = await organizationService.getMembers(
		adminUser.id,
		organization.id,
	);
	const adminUserMembership = members.find((m) => m.userId === adminUser.id);
	assert(adminUserMembership);

	return {
		organizationService,
		adminUser,
		adminUserMembership,
		userService,
		organization,
		memberUser,
		memberUserMembership: res.data.member,
		notInOrganizationUser,
	};
}

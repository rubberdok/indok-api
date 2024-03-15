import { faker } from "@faker-js/faker";
import { makeTestServices } from "~/__tests__/dependencies-factory.js";
import {
	InvalidArgumentErrorV2,
	NotFoundError,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
import { makeMockContext } from "~/lib/context.js";

describe("OrganizationService", () => {
	describe("#addMember", () => {
		it("should add a member to an organization", async () => {
			const { user, userNotInOrganization, organization, organizationService } =
				await makeDeps();

			const result = await organizationService.members.addMember(
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

		it("adds a member to an organization by their email", async () => {
			const { user, userNotInOrganization, organization, organizationService } =
				await makeDeps();

			const result = await organizationService.members.addMember(
				makeMockContext(user),
				{
					email: userNotInOrganization.email,
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

		it("returns NotFoundError if a user with that email does not exist", async () => {
			const { user, organization, organizationService } = await makeDeps();

			const result = await organizationService.members.addMember(
				makeMockContext(user),
				{
					email: faker.internet.email(),
					organizationId: organization.id,
					role: "MEMBER",
				},
			);
			expect(result).toEqual({
				ok: false,
				error: expect.any(NotFoundError),
			});
		});

		it("returns InvalidArgumentError if a user is already a member of the organization", async () => {
			const { user, organization, organizationService } = await makeDeps();

			const result = await organizationService.members.addMember(
				makeMockContext(user),
				{
					userId: user.id,
					organizationId: organization.id,
					role: "MEMBER",
				},
			);
			expect(result).toEqual({
				ok: false,
				error: expect.any(InvalidArgumentErrorV2),
			});
		});

		it("should return ok: false and unauthorized error if not logged in", async () => {
			const { userNotInOrganization, organization, organizationService } =
				await makeDeps();

			const result = await organizationService.members.addMember(
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

			const result = await organizationService.members.addMember(
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

			const addMemberResult = await organizationService.members.addMember(
				makeMockContext(user),
				{
					userId: userNotInOrganization.id,
					organizationId: organization.id,
					role: "MEMBER",
				},
			);
			if (!addMemberResult.ok) throw addMemberResult.error;

			const result = await organizationService.members.addMember(
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

	const organization = await organizationService.organizations.create(
		makeMockContext(user),
		{
			name: faker.string.uuid(),
		},
	);

	return {
		organizationService,
		user,
		userService,
		organization,
		userNotInOrganization,
		userNotInOrganization2,
	};
}

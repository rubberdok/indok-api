import { faker } from "@faker-js/faker";
import { FeaturePermission, Prisma } from "@prisma/client";
import { Role } from "~/domain/organizations.js";
import prisma from "~/lib/prisma.js";
import { MemberRepository } from "~/repositories/organizations/members.js";
import { OrganizationRepository } from "~/repositories/organizations/organizations.js";
import { UserRepository } from "~/repositories/users/index.js";
import { PermissionService } from "../../service.js";

let permissionService: PermissionService;

describe("OrganizationsService", () => {
	beforeAll(() => {
		const userRepository = new UserRepository(prisma);
		const memberRepository = new MemberRepository(prisma);
		const organizationRepository = new OrganizationRepository(prisma);
		permissionService = new PermissionService(
			memberRepository,
			userRepository,
			organizationRepository,
		);
	});

	describe("hasRole", () => {
		interface TestCase {
			arrange: {
				user: Prisma.UserCreateInput;
				organization: Prisma.OrganizationCreateInput;
				member: { role: Role | null };
			};
			requiredFeaturePermission?: FeaturePermission;
			requiredRole: Role;
			expected: boolean;
		}

		const testCases: TestCase[] = [
			{
				arrange: {
					user: makeUser({ isSuperUser: true }),
					organization: {
						name: faker.string.sample(20),
					},
					member: { role: null },
				},
				requiredRole: Role.ADMIN,
				expected: true,
			},
			{
				arrange: {
					user: makeUser({ isSuperUser: false }),
					organization: {
						name: faker.string.sample(20),
					},
					member: { role: null },
				},
				requiredRole: Role.MEMBER,
				expected: false,
			},
			{
				arrange: {
					user: makeUser({ isSuperUser: false }),
					organization: {
						name: faker.string.sample(20),
					},
					member: {
						role: Role.MEMBER,
					},
				},
				requiredRole: Role.MEMBER,
				expected: true,
			},
			{
				arrange: {
					user: makeUser({ isSuperUser: false }),
					organization: {
						name: faker.string.sample(20),
					},
					member: {
						role: Role.ADMIN,
					},
				},
				requiredRole: Role.ADMIN,
				expected: true,
			},
			{
				arrange: {
					user: makeUser({ isSuperUser: false }),
					organization: {
						name: faker.string.sample(20),
					},
					member: {
						role: Role.MEMBER,
					},
				},
				requiredRole: Role.ADMIN,
				expected: false,
			},
			{
				arrange: {
					user: makeUser({ isSuperUser: false }),
					organization: {
						name: faker.string.sample(20),
					},
					member: {
						role: Role.MEMBER,
					},
				},
				requiredRole: Role.ADMIN,
				expected: false,
			},
			{
				arrange: {
					user: makeUser({ isSuperUser: false }),
					organization: {
						name: faker.string.sample(20),
					},
					member: {
						role: Role.ADMIN,
					},
				},
				requiredFeaturePermission: FeaturePermission.CABIN_BOOKING,
				requiredRole: Role.MEMBER,
				expected: false,
			},
			{
				arrange: {
					user: makeUser({ isSuperUser: true }),
					organization: {
						name: faker.string.sample(20),
					},
					member: {
						role: null,
					},
				},
				requiredFeaturePermission: FeaturePermission.CABIN_BOOKING,
				requiredRole: Role.ADMIN,
				expected: true,
			},
			{
				arrange: {
					user: makeUser({ isSuperUser: false }),
					organization: {
						name: faker.string.sample(20),
						featurePermissions: [FeaturePermission.CABIN_BOOKING],
					},
					member: {
						role: Role.ADMIN,
					},
				},
				requiredFeaturePermission: FeaturePermission.CABIN_BOOKING,
				requiredRole: Role.MEMBER,
				expected: true,
			},
			{
				arrange: {
					user: makeUser({ isSuperUser: false }),
					organization: {
						name: faker.string.sample(20),
						featurePermissions: [
							FeaturePermission.CABIN_BOOKING,
							FeaturePermission.ARCHIVE,
						],
					},
					member: {
						role: Role.ADMIN,
					},
				},
				requiredFeaturePermission: FeaturePermission.ARCHIVE,
				requiredRole: Role.MEMBER,
				expected: true,
			},
			{
				arrange: {
					user: makeUser({ isSuperUser: false }),
					organization: {
						name: faker.string.sample(20),
						featurePermissions: [],
					},
					member: {
						role: Role.ADMIN,
					},
				},
				requiredFeaturePermission: FeaturePermission.ARCHIVE,
				requiredRole: Role.MEMBER,
				expected: false,
			},
		];

		test.concurrent.each(testCases)(
			"should return $expected for requiredRole: $requiredRole, requiredFeaturePermission $requiredFeaturePermission with: [isSuperUser: $arrange.user.isSuperUser], [role: $arrange.member.role], [featurePermissions: $arrange.organization.featurePermissions]",
			async ({
				arrange,
				expected,
				requiredRole,
				requiredFeaturePermission,
			}) => {
				/**
				 * Arrange
				 *
				 * 1. Create a user with userId {userId} based on the arrange.user object
				 * 2. Create an organization with organizationId {organizationId} based on the arrange.organization object
				 * 3. Create a member with userId {userId} and organizationId {organizationId} based on the arrange.member object
				 * unless undefined
				 */
				// 1.
				const user = await prisma.user.create({
					data: arrange.user,
				});
				// 2.
				const organization = await prisma.organization.create({
					data: arrange.organization,
				});
				// 3.
				if (arrange.member.role !== null) {
					await prisma.member.create({
						data: {
							role: arrange.member.role,
							userId: user.id,
							organizationId: organization.id,
						},
					});
				}

				/**
				 * Act
				 *
				 * 1. Call the hasRole method on the permissionService with the userId and organizationId
				 */
				const result = permissionService.hasRole({
					userId: user.id,
					organizationId: organization.id,
					role: requiredRole,
					featurePermission: requiredFeaturePermission,
				});

				/**
				 * Assert that the user has the expected role
				 */
				await expect(result).resolves.toEqual(expected);
			},
		);
	});

	describe("#isSuperUser", () => {
		it("should return true if the user is a super user", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create a user with isSuperUser set to true
			 */
			const user = await prisma.user.create({
				data: makeUser({ isSuperUser: true }),
			});

			/**
			 * Act
			 *
			 * 1. Call the isSuperUser method on the permissionService with the userId
			 */
			const { isSuperUser } = await permissionService.isSuperUser(user.id);

			/**
			 * Assert that the user is a super user
			 */
			expect(isSuperUser).toEqual(true);
		});

		it("should return false if the user is not a super user", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create a user with isSuperUser set to true
			 */
			const user = await prisma.user.create({
				data: makeUser({ isSuperUser: false }),
			});

			/**
			 * Act
			 *
			 * 1. Call the isSuperUser method on the permissionService with the userId
			 */
			const { isSuperUser } = await permissionService.isSuperUser(user.id);

			/**
			 * Assert that the user is a super user
			 */
			expect(isSuperUser).toEqual(false);
		});

		it("should return false if user is undefined", async () => {
			/**
			 * Act
			 *
			 * 1. Call the isSuperUser method on the permissionService with the userId
			 */
			const { isSuperUser } = await permissionService.isSuperUser(undefined);

			/**
			 * Assert that the user is a super user
			 */
			expect(isSuperUser).toEqual(false);
		});
	});

	describe("hasFeaturePermission", () => {
		it("should return true if the user is a super user", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create a user with isSuperUser set to true
			 */
			const user = await prisma.user.create({
				data: makeUser({ isSuperUser: true }),
			});

			/**
			 * Act
			 * 1. Call the hasFeaturePermission method on the permissionService with the userId and a feature permission
			 */
			const result = permissionService.hasFeaturePermission({
				userId: user.id,
				featurePermission: FeaturePermission.CABIN_BOOKING,
			});

			/**
			 * Assert that the user has the feature permission
			 */
			await expect(result).resolves.toEqual(true);
		});

		it("should return false if the user is not a super user, and not a member of an organization", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create a user with isSuperUser set to true
			 */
			const user = await prisma.user.create({
				data: makeUser({ isSuperUser: false }),
			});

			/**
			 * Act
			 * 1. Call the hasFeaturePermission method on the permissionService with the userId and a feature permission
			 */
			const result = permissionService.hasFeaturePermission({
				userId: user.id,
				featurePermission: FeaturePermission.CABIN_BOOKING,
			});

			/**
			 * Assert that the user does not have the feature permission
			 */
			await expect(result).resolves.toEqual(false);
		});

		it("should return true if the user is a member of an organization with the feature permission", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create a user with isSuperUser set to true
			 * 2. Create an organization with the feature permission
			 * 3. Create a member with the user and organization
			 * 4. Create an organization without the feature permission
			 *
			 */
			const user = await prisma.user.create({
				data: makeUser({ isSuperUser: false }),
			});
			const organizationWithoutFeaturePermission = await makeOrganization({});
			const organizationWithFeaturePermission = await makeOrganization({
				featurePermissions: [FeaturePermission.CABIN_BOOKING],
			});
			await makeMember({
				userId: user.id,
				organizationId: organizationWithoutFeaturePermission.id,
			});
			await makeMember({
				userId: user.id,
				organizationId: organizationWithFeaturePermission.id,
			});

			/**
			 * Act
			 * 1. Call the hasFeaturePermission method on the permissionService with the userId and a feature permission
			 */
			const result = permissionService.hasFeaturePermission({
				userId: user.id,
				featurePermission: FeaturePermission.CABIN_BOOKING,
			});

			/**
			 * Assert that the user has the feature permission
			 */
			await expect(result).resolves.toEqual(true);
		});

		it("should return false if the user is a member of an organization without the feature permission", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create a user with isSuperUser set to true
			 * 2. Create an organization with the feature permission
			 * 3. Create a member with the user and organization
			 * 4. Create an organization without the feature permission
			 *
			 */
			const user = await prisma.user.create({
				data: makeUser({ isSuperUser: false }),
			});
			const organizationWithoutFeaturePermission = await makeOrganization({});
			await makeOrganization({
				featurePermissions: [FeaturePermission.CABIN_BOOKING],
			});
			await makeMember({
				userId: user.id,
				organizationId: organizationWithoutFeaturePermission.id,
			});

			/**
			 * Act
			 * 1. Call the hasFeaturePermission method on the permissionService with the userId and a feature permission
			 */
			const result = permissionService.hasFeaturePermission({
				userId: user.id,
				featurePermission: FeaturePermission.CABIN_BOOKING,
			});

			/**
			 * Assert that the user has the feature permission
			 */
			await expect(result).resolves.toEqual(false);
		});

		it("should return true if the user is a member of an organization with multiple feature permissions", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create a user with isSuperUser set to true
			 * 2. Create an organization with the feature permission
			 * 3. Create a member with the user and organization
			 * 4. Create an organization without the feature permission
			 */
			const user = await prisma.user.create({
				data: makeUser({ isSuperUser: false }),
			});
			const organizationWithoutFeaturePermission = await makeOrganization({});
			const organizationWithFeaturePermission = await makeOrganization({
				featurePermissions: [
					FeaturePermission.CABIN_BOOKING,
					FeaturePermission.ARCHIVE,
				],
			});
			await makeMember({
				userId: user.id,
				organizationId: organizationWithoutFeaturePermission.id,
			});
			await makeMember({
				userId: user.id,
				organizationId: organizationWithFeaturePermission.id,
			});

			/**
			 * Act
			 * 1. Call the hasFeaturePermission method on the permissionService with the userId and a feature permission
			 */
			const result = permissionService.hasFeaturePermission({
				userId: user.id,
				featurePermission: FeaturePermission.CABIN_BOOKING,
			});

			/**
			 * Assert that the user has the feature permission
			 */
			await expect(result).resolves.toEqual(true);
		});
	});
});

function makeUser(data: { isSuperUser: boolean }) {
	return {
		email: faker.internet.email(),
		feideId: faker.string.uuid(),
		firstName: faker.person.firstName(),
		lastName: faker.person.lastName(),
		username: faker.string.sample(20),
		isSuperUser: data.isSuperUser,
	};
}

function makeOrganization(data: { featurePermissions?: FeaturePermission[] }) {
	return prisma.organization.create({
		data: {
			name: faker.string.sample(20),
			featurePermissions: data.featurePermissions,
		},
	});
}

function makeMember(data: {
	userId: string;
	organizationId: string;
	role?: Role;
}) {
	return prisma.member.create({
		data: {
			userId: data.userId,
			organizationId: data.organizationId,
			role: data.role ?? Role.MEMBER,
		},
	});
}

import { faker } from "@faker-js/faker";
import { FeaturePermission, type Organization } from "@prisma/client";
import { type DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import { Role } from "~/domain/organizations.js";
import type { User } from "~/domain/users.js";
import { makeMockContext } from "~/lib/context.js";
import {
	type MemberRepository,
	type OrganizationRepository,
	PermissionService,
	type UserRepository,
} from "../../service.js";

describe("PermissionService", () => {
	let permissionService: PermissionService;
	let UserRepository: DeepMockProxy<UserRepository>;
	let memberRepository: DeepMockProxy<MemberRepository>;
	let organizationRepository: DeepMockProxy<OrganizationRepository>;

	beforeAll(() => {
		UserRepository = mockDeep<UserRepository>();
		memberRepository = mockDeep<MemberRepository>();
		organizationRepository = mockDeep<OrganizationRepository>();
		permissionService = new PermissionService(
			memberRepository,
			UserRepository,
			organizationRepository,
		);
	});

	describe("hasRole should return", () => {
		interface TestCase {
			name: string;
			arrange: {
				user: {
					id: string;
					isSuperUser: boolean;
				};
				organizationRole?: Role;
				organization?: {
					featurePermissions: FeaturePermission[];
				};
			};
			act: {
				requiredFeaturePermission?: FeaturePermission;
				requiredRole: Role;
			};
			expected: boolean;
		}

		const testCases: TestCase[] = [
			{
				name: "if the user is a super user",
				arrange: {
					user: {
						id: faker.string.uuid(),
						isSuperUser: true,
					},
				},
				act: {
					requiredRole: Role.ADMIN,
				},
				expected: true,
			},
			{
				name: "if the user is an admin user and it requires admin",
				arrange: {
					user: {
						id: faker.string.uuid(),
						isSuperUser: false,
					},
					organizationRole: Role.ADMIN,
				},
				act: {
					requiredRole: Role.ADMIN,
				},
				expected: true,
			},
			{
				name: "if the user is an member user and it requires member",
				arrange: {
					user: {
						id: faker.string.uuid(),
						isSuperUser: false,
					},
					organizationRole: Role.MEMBER,
				},
				act: {
					requiredRole: Role.MEMBER,
				},
				expected: true,
			},
			{
				name: "if the user is an member user and it requires admin",
				arrange: {
					user: {
						id: faker.string.uuid(),
						isSuperUser: false,
					},
					organizationRole: Role.MEMBER,
				},
				act: {
					requiredRole: Role.ADMIN,
				},
				expected: false,
			},
			{
				name: "if the user is an not a member and it requires a member",
				arrange: {
					user: {
						id: faker.string.uuid(),
						isSuperUser: false,
					},
				},
				act: {
					requiredRole: Role.MEMBER,
				},
				expected: false,
			},
			{
				name: "if the user is super user and it requires a feature permission",
				arrange: {
					user: {
						id: faker.string.uuid(),
						isSuperUser: true,
					},
				},
				act: {
					requiredFeaturePermission: FeaturePermission.CABIN_ADMIN,
					requiredRole: Role.MEMBER,
				},
				expected: true,
			},
			{
				name: "if the user is an admin and it requires a feature permission that the organization has",
				arrange: {
					user: {
						id: faker.string.uuid(),
						isSuperUser: false,
					},
					organization: {
						featurePermissions: [FeaturePermission.CABIN_ADMIN],
					},
					organizationRole: Role.ADMIN,
				},
				act: {
					requiredFeaturePermission: FeaturePermission.CABIN_ADMIN,
					requiredRole: Role.MEMBER,
				},
				expected: true,
			},
			{
				name: "if the user is a member and it requires a feature permission that the organization has",
				arrange: {
					user: {
						id: faker.string.uuid(),
						isSuperUser: false,
					},
					organization: {
						featurePermissions: [FeaturePermission.CABIN_ADMIN],
					},
					organizationRole: Role.MEMBER,
				},
				act: {
					requiredFeaturePermission: FeaturePermission.CABIN_ADMIN,
					requiredRole: Role.MEMBER,
				},
				expected: true,
			},
			{
				name: "if the user is an admin but it requires a feature permission that the organization does not have",
				arrange: {
					user: {
						id: faker.string.uuid(),
						isSuperUser: false,
					},
					organization: {
						featurePermissions: [FeaturePermission.ARCHIVE_WRITE_DOCUMENTS],
					},
					organizationRole: Role.MEMBER,
				},
				act: {
					requiredFeaturePermission: FeaturePermission.CABIN_ADMIN,
					requiredRole: Role.MEMBER,
				},
				expected: false,
			},
			{
				name: "if the user is an admin but it requires a feature permission but organization has no feature permissions",
				arrange: {
					user: {
						id: faker.string.uuid(),
						isSuperUser: false,
					},
					organization: {
						featurePermissions: [],
					},
					organizationRole: Role.MEMBER,
				},
				act: {
					requiredFeaturePermission: FeaturePermission.CABIN_ADMIN,
					requiredRole: Role.MEMBER,
				},
				expected: false,
			},
		];

		test.each(testCases)(
			"$expected $name",
			async ({ arrange, act, expected }) => {
				/**
				 * Arrange
				 *
				 * Set up mocks for user service and member repository according to the
				 * test case.
				 */
				UserRepository.get.mockResolvedValueOnce(mock<User>(arrange.user));
				memberRepository.hasRole.mockImplementation((data) => {
					return Promise.resolve(arrange.organizationRole === data.role);
				});
				organizationRepository.get.mockResolvedValue(
					mock<Organization>(arrange.organization),
				);

				/**
				 * Act
				 *
				 * Call hasRole with the given arguments
				 */
				const result = permissionService.hasRole(
					makeMockContext(arrange.user),
					{
						organizationId: faker.string.uuid(),
						role: act.requiredRole,
						featurePermission: act.requiredFeaturePermission,
					},
				);

				/**
				 * Assert
				 *
				 * Check that the result is as expected
				 */
				await expect(result).resolves.toBe(expected);
			},
		);
	});
});

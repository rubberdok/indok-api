import { faker } from "@faker-js/faker";
import { type DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import {
	FeaturePermission,
	type FeaturePermissionType,
	type Organization,
	OrganizationRole,
	type OrganizationRoleType,
} from "~/domain/organizations.js";
import type { User } from "~/domain/users.js";
import { makeMockContext } from "~/lib/context.js";
import {
	type MemberRepository,
	type OrganizationRepository,
	OrganizationService,
	type UserService,
} from "../../service.js";

describe("PermissionService", () => {
	let organizationService: ReturnType<typeof OrganizationService>;
	let userService: DeepMockProxy<UserService>;
	let memberRepository: DeepMockProxy<MemberRepository>;
	let organizationRepository: DeepMockProxy<OrganizationRepository>;

	beforeAll(() => {
		userService = mockDeep<UserService>();
		memberRepository = mockDeep<MemberRepository>();
		organizationRepository = mockDeep<OrganizationRepository>();
		organizationService = OrganizationService({
			memberRepository,
			organizationRepository,
			userService,
		});
	});

	describe("hasRole should return", () => {
		interface TestCase {
			name: string;
			arrange: {
				user: {
					id: string;
					isSuperUser: boolean;
				};
				organizationRole?: OrganizationRoleType;
				organization?: {
					featurePermissions: FeaturePermissionType[];
				};
			};
			act: {
				requiredFeaturePermission?: FeaturePermissionType;
				requiredRole: OrganizationRoleType;
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
					requiredRole: OrganizationRole.ADMIN,
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
					organizationRole: OrganizationRole.ADMIN,
				},
				act: {
					requiredRole: OrganizationRole.ADMIN,
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
					organizationRole: OrganizationRole.MEMBER,
				},
				act: {
					requiredRole: OrganizationRole.MEMBER,
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
					organizationRole: OrganizationRole.MEMBER,
				},
				act: {
					requiredRole: OrganizationRole.ADMIN,
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
					requiredRole: OrganizationRole.MEMBER,
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
					requiredRole: OrganizationRole.MEMBER,
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
					organizationRole: OrganizationRole.ADMIN,
				},
				act: {
					requiredFeaturePermission: FeaturePermission.CABIN_ADMIN,
					requiredRole: OrganizationRole.MEMBER,
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
					organizationRole: OrganizationRole.MEMBER,
				},
				act: {
					requiredFeaturePermission: FeaturePermission.CABIN_ADMIN,
					requiredRole: OrganizationRole.MEMBER,
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
					organizationRole: OrganizationRole.MEMBER,
				},
				act: {
					requiredFeaturePermission: FeaturePermission.CABIN_ADMIN,
					requiredRole: OrganizationRole.MEMBER,
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
					organizationRole: OrganizationRole.MEMBER,
				},
				act: {
					requiredFeaturePermission: FeaturePermission.CABIN_ADMIN,
					requiredRole: OrganizationRole.MEMBER,
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
				userService.get.mockResolvedValueOnce(mock<User>(arrange.user));
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
				const result = organizationService.permissions.hasRole(
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

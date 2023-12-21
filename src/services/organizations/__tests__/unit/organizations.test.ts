import { faker } from "@faker-js/faker";
import type { Member, Organization } from "@prisma/client";
import { DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import {
	InvalidArgumentError,
	KnownDomainError,
	PermissionDeniedError,
} from "~/domain/errors.js";
import { Role } from "~/domain/organizations.js";
import { User } from "~/domain/users.js";
import { UserRepository } from "~/repositories/users/index.js";
import { PermissionService } from "~/services/permissions/service.js";
import {
	MemberRepository,
	OrganizationRepository,
	OrganizationService,
} from "../../service.js";
import {
	getMockGetImplementation,
	getMockHasRoleImplementation,
} from "./mocks.js";

interface MemberRepositoryMock extends MemberRepository {
	hasRole(data: {
		userId: string;
		organizationId: string;
		role: Role;
	}): Promise<boolean>;
}

let organizationService: OrganizationService;
let organizationRepository: DeepMockProxy<OrganizationRepository>;
let memberRepository: DeepMockProxy<MemberRepositoryMock>;
let userRepository: DeepMockProxy<UserRepository>;
let permissionService: PermissionService;

describe("OrganizationService", () => {
	beforeEach(() => {
		organizationRepository = mockDeep<OrganizationRepository>();
		memberRepository = mockDeep<MemberRepositoryMock>();
		userRepository = mockDeep<UserRepository>();
		permissionService = new PermissionService(
			memberRepository,
			userRepository,
			organizationRepository,
		);
		organizationService = new OrganizationService(
			organizationRepository,
			memberRepository,
			permissionService,
		);
	});

	describe("hasRole", () => {
		const testCases: {
			state: {
				user: User;
				role: Role | null;
			};
			requiredRole: Role;
			organizationId: string;
			expected: boolean;
		}[] = [
			{
				state: {
					user: mock<User>({ id: "1", isSuperUser: true }),
					role: null,
				},
				requiredRole: Role.ADMIN,
				organizationId: "o1",
				expected: true,
			},
			{
				state: {
					user: mock<User>({ id: "1", isSuperUser: false }),
					role: null,
				},
				requiredRole: Role.MEMBER,
				organizationId: "o1",
				expected: false,
			},
			{
				state: {
					user: mock<User>({ id: "1", isSuperUser: false }),
					role: Role.MEMBER,
				},
				requiredRole: Role.MEMBER,
				organizationId: "o1",
				expected: true,
			},
			{
				state: {
					user: mock<User>({ id: "1", isSuperUser: false }),
					role: Role.ADMIN,
				},
				requiredRole: Role.MEMBER,
				organizationId: "o1",
				expected: true,
			},
			{
				state: {
					user: mock<User>({ id: "1", isSuperUser: false }),
					role: Role.MEMBER,
				},
				requiredRole: Role.ADMIN,
				organizationId: "o1",
				expected: false,
			},
			{
				state: {
					user: mock<User>({ id: "1", isSuperUser: false }),
					role: Role.ADMIN,
				},
				requiredRole: Role.ADMIN,
				organizationId: "o1",
				expected: true,
			},
		];

		test.each(testCases)(
			"requiredRole: $requiredRole, isSuperUser: $state.user.isSuperUser, role: $state.role, should return: $expected",
			async ({ state, requiredRole, organizationId, expected }) => {
				/**
				 * Arrange.
				 *
				 * Set up the mock user and hasRole implementation
				 */
				userRepository.get.mockResolvedValueOnce(state.user);
				memberRepository.hasRole.mockImplementation(
					getMockHasRoleImplementation({
						userId: state.user.id,
						organizationId,
						role: state.role,
					}),
				);

				// Act
				const actual = await permissionService.hasRole({
					userId: state.user.id,
					organizationId,
					role: requiredRole,
				});

				// Assert
				expect(actual).toBe(expected);
			},
		);
	});

	describe("update", () => {
		describe("should raise:", () => {
			const testCases: {
				name: string;
				state: {
					user: User;
					role: Role | null;
				};
				input: {
					organizationId: string;
					name?: string;
					description?: string;
				};
				expectedError: typeof KnownDomainError;
			}[] = [
				{
					name: "if the user is not a member of the organization",
					state: {
						user: mock<User>({ id: "1", isSuperUser: false }),
						role: null,
					},
					input: {
						organizationId: "o1",
						name: faker.company.name(),
					},
					expectedError: PermissionDeniedError,
				},
				{
					name: "if the description is too long",
					state: {
						user: mock<User>({ id: "1", isSuperUser: false }),
						role: Role.MEMBER,
					},
					input: {
						organizationId: "o1",
						description: faker.string.sample(10001),
					},
					expectedError: InvalidArgumentError,
				},
				{
					name: "if the name is too long",
					state: {
						user: mock<User>({ id: "1", isSuperUser: false }),
						role: Role.MEMBER,
					},
					input: {
						organizationId: "o1",
						name: faker.string.sample(101),
					},
					expectedError: InvalidArgumentError,
				},
			];

			test.each(testCases)(
				"$expectedError.name $name",
				async ({ state, input, expectedError }) => {
					/**
					 * Arrange.
					 *
					 * Set up the mock user and hasRole implementation.
					 */
					userRepository.get.mockResolvedValue(state.user);
					memberRepository.hasRole.mockImplementation(
						getMockHasRoleImplementation({
							userId: state.user.id,
							organizationId: "o1",
							role: state.role,
						}),
					);

					/**
					 * Act and assert
					 *
					 * We call the update method with the user ID, organization ID, and the
					 * new organization name.
					 */
					const { organizationId, name, description } = input;
					await expect(
						organizationService.update(state.user.id, organizationId, {
							name,
							description,
						}),
					).rejects.toThrow(expectedError);
				},
			);
		});

		describe("should update the organization", () => {
			const testCases: {
				state: {
					user: User;
					role: Role | null;
				};
				input: {
					organizationId: string;
					name?: string;
					description?: string;
				};
			}[] = [
				{
					state: {
						user: mock<User>({ id: "1", isSuperUser: false }),
						role: Role.ADMIN,
					},
					input: {
						organizationId: "o1",
						name: faker.company.name(),
						description: faker.company.catchPhrase(),
					},
				},
				{
					state: {
						user: mock<User>({ id: "1", isSuperUser: false }),
						role: Role.MEMBER,
					},
					input: {
						organizationId: "o1",
						name: faker.company.name(),
						description: faker.company.catchPhrase(),
					},
				},
				{
					state: {
						user: mock<User>({ id: "1", isSuperUser: true }),
						role: null,
					},
					input: {
						organizationId: "o1",
						name: faker.company.name(),
						description: faker.company.catchPhrase(),
					},
				},
			];

			test.each(testCases)(
				"name: $input.name, description: $input.description, role: $state.role, isSuperUser: $state.user.isSuperUser",
				async ({ state, input }) => {
					/**
					 * Arrange.
					 *
					 * Set up the mock user and hasRole implementation.
					 */
					userRepository.get.mockResolvedValue(state.user);
					memberRepository.hasRole.mockImplementation(
						getMockHasRoleImplementation({
							userId: state.user.id,
							organizationId: "o1",
							role: state.role,
						}),
					);

					/**
					 * Act
					 *
					 * We call the update method with the user ID, organization ID, and the
					 * new organization name.
					 */
					const { organizationId, name, description } = input;
					const actual = organizationService.update(
						state.user.id,
						organizationId,
						{ name, description },
					);

					/**
					 * Assert
					 *
					 * Here, we simply check that the update method resolves without throwing,
					 * and that the organizationRepository.update method was called with the
					 * correct arguments.
					 *
					 * Asserting any returns here would be redundant, since the update method
					 * on the repository is mocked.
					 */
					await expect(actual).resolves.not.toThrow();
					expect(organizationRepository.update).toHaveBeenCalledWith(
						input.organizationId,
						{
							name: input.name,
							description: input.description,
						},
					);
				},
			);
		});
	});

	describe("create", () => {
		describe("should raise:", () => {
			const testCases: {
				name: string;
				state: {
					user: User;
				};
				input: {
					userId: string;
					name: string;
					description?: string;
				};
				expectedError: typeof KnownDomainError;
			}[] = [
				{
					name: "if the description is too long",
					state: {
						user: mock<User>({ id: "1", isSuperUser: false }),
					},
					input: {
						userId: "1",
						name: faker.company.name(),
						description: faker.string.sample(10001),
					},
					expectedError: InvalidArgumentError,
				},
				{
					name: "if the name is too long",
					state: {
						user: mock<User>({ id: "1", isSuperUser: false }),
					},
					input: {
						userId: "1",
						name: faker.string.sample(101),
					},
					expectedError: InvalidArgumentError,
				},
				{
					name: "if name is blank",
					state: {
						user: mock<User>({ id: "1", isSuperUser: false }),
					},
					input: {
						userId: "1",
						name: "",
					},
					expectedError: InvalidArgumentError,
				},
			];

			test.each(testCases)(
				"$expectedError.name $name",
				async ({ state, input, expectedError }) => {
					/**
					 * Arrange.
					 *
					 * Set up the mock user and hasRole implementation.
					 */
					userRepository.get.mockResolvedValueOnce(state.user);
					const { userId, ...rest } = input;

					/**
					 * Act and assert
					 *
					 * We call the update method with the user ID, organization ID, and the
					 * new organization name.
					 */
					await expect(
						organizationService.create(userId, rest),
					).rejects.toThrow(expectedError);
				},
			);
		});

		describe("should create the organization", () => {
			const testCases: {
				name: string;
				state: {
					user: User;
				};
				input: {
					userId: string;
					name: string;
					description?: string;
				};
			}[] = [
				{
					name: "with just a name",
					state: {
						user: mock<User>({ id: "1", isSuperUser: false }),
					},
					input: {
						userId: "1",
						name: faker.company.name(),
					},
				},
				{
					name: "with name and description",
					state: {
						user: mock<User>({ id: "1", isSuperUser: false }),
					},
					input: {
						userId: "1",
						name: faker.company.name(),
						description: faker.company.catchPhrase(),
					},
				},
			];

			test.each(testCases)(
				"name: $input.name, description: $input.description",
				async ({ state, input }) => {
					/**
					 * Arrange.
					 *
					 * Set up the mock user and hasRole implementation.
					 */
					userRepository.get.mockResolvedValueOnce(state.user);
					const { userId, ...rest } = input;

					/**
					 * Act
					 *
					 * We call the update method with the user ID, organization ID, and the
					 * new organization name.
					 */
					const actual = organizationService.create(userId, rest);

					/**
					 * Assert
					 *
					 * Here, we simply check that the update method resolves without throwing,
					 * and that the organizationRepository.update method was called with the
					 * correct arguments.
					 *
					 * Asserting any returns here would be redundant, since the update method
					 * on the repository is mocked.
					 */
					await expect(actual).resolves.not.toThrow();
					expect(organizationRepository.create).toHaveBeenCalledWith({
						userId,
						...rest,
					});
				},
			);
		});
	});

	describe("addMember", () => {
		it("should add a member to the organization", async () => {
			/**
			 * Arrange.
			 *
			 * Set up the mock user and hasRole implementation.
			 */
			userRepository.get.mockResolvedValueOnce(
				mock<User>({ id: "1", isSuperUser: false }),
			);
			memberRepository.hasRole.mockImplementation(
				getMockHasRoleImplementation({
					userId: "1",
					organizationId: "o1",
					role: Role.ADMIN,
				}),
			);

			const actual = organizationService.addMember("1", {
				userId: "2",
				organizationId: "o1",
				role: Role.MEMBER,
			});

			// Asser that we don't throw, and that the memberRepository.create method was called with the correct arguments.
			await expect(actual).resolves.not.toThrow();
			expect(memberRepository.create).toHaveBeenCalledWith({
				userId: "2",
				organizationId: "o1",
				role: Role.MEMBER,
			});
		});

		describe("should raise:", () => {
			interface TestCase {
				name: string;
				state: {
					user: User;
					role: Role | null;
				};
				input: {
					organizationId: string;
					userId: string;
					role: Role;
				};
				expectedError: typeof KnownDomainError;
			}
			const testCases: TestCase[] = [
				{
					name: "if the user is not a member of the organization",
					state: {
						user: mock<User>({ id: "1", isSuperUser: false }),
						role: null,
					},
					input: {
						organizationId: "o1",
						userId: "2",
						role: Role.MEMBER,
					},
					expectedError: PermissionDeniedError,
				},
				{
					name: "if the user is not an admin of the organization",
					state: {
						user: mock<User>({ id: "1", isSuperUser: false }),
						role: Role.MEMBER,
					},
					input: {
						organizationId: "o1",
						userId: "2",
						role: Role.MEMBER,
					},
					expectedError: PermissionDeniedError,
				},
			];

			test.each(testCases)(
				"$expectedError.name $name",
				async ({ state, input, expectedError }) => {
					/**
					 * Arrange.
					 *
					 * Set up the mock user and hasRole implementation.
					 */
					userRepository.get.mockResolvedValueOnce(state.user);
					memberRepository.hasRole.mockImplementation(
						getMockHasRoleImplementation({
							userId: state.user.id,
							organizationId: "o1",
							role: state.role,
						}),
					);

					/**
					 * Act and assert
					 *
					 * We call the addMember method with the user ID, organization ID, and the
					 * new member's user ID and role.
					 */
					await expect(
						organizationService.addMember(state.user.id, input),
					).rejects.toThrow(expectedError);
				},
			);
		});
	});

	describe("removeMember", () => {
		describe("should raise:", () => {
			interface TestCase {
				name: string;
				state: {
					user: User;
					role: Role | null;
					members: Member[];
				};
				input: {
					organizationId: string;
					userId: string;
				};
				expectedError: typeof KnownDomainError;
			}
			const testCases: TestCase[] = [
				{
					name: "if the user is not a member of the organization",
					state: {
						user: mock<User>({ id: "1", isSuperUser: false }),
						role: null,
						members: [],
					},
					input: {
						organizationId: "o1",
						userId: "1",
					},
					expectedError: PermissionDeniedError,
				},
				{
					name: "if the user is not an admin of the organization, and not leaving, i.e. removing themselves",
					state: {
						user: mock<User>({ id: "1", isSuperUser: false }),
						role: Role.MEMBER,
						members: [],
					},
					input: {
						organizationId: "o1",
						userId: "2",
					},
					expectedError: PermissionDeniedError,
				},
				{
					name: "if the user is the last user of the organization",
					state: {
						user: mock<User>({ id: "1", isSuperUser: false }),
						role: Role.ADMIN,
						members: [
							mock<Member>({
								id: "1",
								userId: "1",
								organizationId: "o1",
								role: Role.ADMIN,
							}),
						],
					},
					input: {
						organizationId: "o1",
						userId: "1",
					},
					expectedError: InvalidArgumentError,
				},
				{
					name: "if the user is the last ADMIN user of the organization",
					state: {
						user: mock<User>({ id: "1", isSuperUser: false }),
						role: Role.ADMIN,
						members: [
							mock<Member>({
								id: "1",
								userId: "1",
								organizationId: "o1",
								role: Role.ADMIN,
							}),
							mock<Member>({
								id: "2",
								userId: "3",
								organizationId: "o1",
								role: Role.MEMBER,
							}),
						],
					},
					input: {
						organizationId: "o1",
						userId: "1",
					},
					expectedError: InvalidArgumentError,
				},
			];

			test.each(testCases)(
				"$expectedError.name $name",
				async ({ state, input, expectedError }) => {
					/**
					 * Arrange.
					 *
					 * Set up the mock user and hasRole implementation.
					 */
					userRepository.get.mockResolvedValueOnce(state.user);
					memberRepository.hasRole.mockImplementation(
						getMockHasRoleImplementation({
							userId: state.user.id,
							organizationId: "o1",
							role: state.role,
						}),
					);
					memberRepository.findMany.mockImplementationOnce((data) => {
						const membersWithMatchingRole = state.members.filter(
							(member) => member.role === data.role,
						);
						return Promise.resolve(membersWithMatchingRole);
					});
					memberRepository.get.mockImplementationOnce(
						getMockGetImplementation(state),
					);

					/**
					 * Act and assert
					 *
					 * We call the addMember method with the user ID, organization ID, and the
					 * new member's user ID and role.
					 */
					await expect(
						organizationService.removeMember(state.user.id, input),
					).rejects.toThrow(expectedError);
				},
			);
		});

		describe("should remove member:", () => {
			interface TestCase {
				name: string;
				state: {
					user: User;
					role: Role | null;
					members: Member[];
				};
				input: {
					organizationId: string;
					userId: string;
				};
			}
			const testCases: TestCase[] = [
				{
					name: "if the user is leaving, i.e. removing themselves, and not the last admin",
					state: {
						user: mock<User>({ id: "1", isSuperUser: false }),
						role: Role.MEMBER,
						members: [
							mock<Member>({
								id: "1",
								userId: "1",
								organizationId: "o1",
								role: Role.MEMBER,
							}),
							mock<Member>({
								id: "2",
								userId: "2",
								organizationId: "o1",
								role: Role.ADMIN,
							}),
						],
					},
					input: {
						organizationId: "o1",
						userId: "1",
					},
				},
				{
					name: "if the user is not the last admin",
					state: {
						user: mock<User>({ id: "1", isSuperUser: false }),
						role: Role.ADMIN,
						members: [
							mock<Member>({
								id: "1",
								userId: "1",
								organizationId: "o1",
								role: Role.ADMIN,
							}),
							mock<Member>({
								id: "2",
								userId: "2",
								organizationId: "o1",
								role: Role.ADMIN,
							}),
						],
					},
					input: {
						organizationId: "o1",
						userId: "2",
					},
				},
				{
					name: "if removing a member as the last admin in the organization",
					state: {
						user: mock<User>({ id: "1", isSuperUser: false }),
						role: Role.ADMIN,
						members: [
							mock<Member>({
								id: "1",
								userId: "1",
								organizationId: "o1",
								role: Role.ADMIN,
							}),
							mock<Member>({
								id: "2",
								userId: "2",
								organizationId: "o1",
								role: Role.MEMBER,
							}),
						],
					},
					input: {
						organizationId: "o1",
						userId: "2",
					},
				},
			];

			test.each(testCases)("$name", async ({ state, input }) => {
				/**
				 * Arrange.
				 *
				 * Set up the mock user and hasRole implementation.
				 */
				userRepository.get.mockResolvedValueOnce(state.user);
				memberRepository.hasRole.mockImplementation(
					getMockHasRoleImplementation({
						userId: state.user.id,
						organizationId: "o1",
						role: state.role,
					}),
				);
				memberRepository.findMany.mockImplementationOnce((data) => {
					const membersWithMatchingRole = state.members.filter(
						(member) => member.role === data.role,
					);
					return Promise.resolve(membersWithMatchingRole);
				});
				memberRepository.get.mockImplementationOnce(
					getMockGetImplementation(state),
				);

				/**
				 * Act and assert
				 *
				 * We call the addMember method with the user ID, organization ID, and the
				 * new member's user ID and role.
				 */
				await expect(
					organizationService.removeMember(state.user.id, input),
				).resolves.not.toThrow();
				expect(memberRepository.remove).toHaveBeenCalledWith(input);
			});
		});
	});

	describe("getMembers", () => {
		it("should get members of the organization", async () => {
			/**
			 * Arrange.
			 *
			 * Set up the mock user and hasRole implementation.
			 */
			userRepository.get.mockResolvedValueOnce(
				mock<User>({ id: "1", isSuperUser: false }),
			);
			memberRepository.hasRole.mockImplementation(
				getMockHasRoleImplementation({
					userId: "1",
					organizationId: "2",
					role: Role.MEMBER,
				}),
			);

			const actual = organizationService.getMembers("1", "2");

			// Asser that we don't throw, and that the memberRepository.get method was called with the correct arguments.
			await expect(actual).resolves.not.toThrow();
			expect(memberRepository.findMany).toHaveBeenCalledWith({
				organizationId: "2",
			});
		});

		it("should raise PermissionDeniedError if not a member", async () => {
			/**
			 * Arrange.
			 *
			 * Set up the mock user and hasRole implementation.
			 */
			userRepository.get.mockResolvedValueOnce(
				mock<User>({ id: "1", isSuperUser: false }),
			);
			memberRepository.hasRole.mockImplementation(
				getMockHasRoleImplementation({
					userId: "1",
					organizationId: "o1",
					role: null,
				}),
			);

			const actual = organizationService.getMembers("1", "1");

			// Assert that we throw a PermissionDeniedError
			await expect(actual).rejects.toThrow(PermissionDeniedError);
		});
	});

	describe("get", () => {
		it("should get the organization", async () => {
			organizationRepository.get.mockResolvedValueOnce(
				mock<Organization>({ id: "1" }),
			);

			const actual = organizationService.get("1");
			await expect(actual).resolves.not.toThrow();
		});
	});

	describe("findMany", () => {
		it("should get the organizations", async () => {
			organizationRepository.findMany.mockResolvedValueOnce([
				mock<Organization>({ id: "1" }),
			]);

			const actual = organizationService.findMany();
			await expect(actual).resolves.not.toThrow();
		});

		it("should get the organizations for a user", async () => {
			organizationRepository.findManyByUserId.mockResolvedValueOnce([
				mock<Organization>({ id: "1" }),
			]);

			const actual = organizationService.findMany({
				userId: faker.string.uuid(),
			});
			await expect(actual).resolves.not.toThrow();
			expect(organizationRepository.findManyByUserId).toHaveBeenCalledWith({
				userId: expect.any(String),
			});
		});
	});
});

import assert, { fail } from "node:assert";
import { faker } from "@faker-js/faker";
import type { Organization } from "@prisma/client";
import { type DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import {
	InvalidArgumentError,
	type KnownDomainError,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
import { Role } from "~/domain/organizations.js";
import type { User } from "~/domain/users.js";
import { makeMockContext } from "~/lib/context.js";
import {
	type MemberRepository,
	type OrganizationRepository,
	OrganizationService,
	type UserService,
} from "../../service.js";
import { getMockHasRoleImplementation } from "./mocks.js";

interface MemberRepositoryMock extends MemberRepository {
	hasRole(data: {
		userId: string;
		organizationId: string;
		role: Role;
	}): Promise<boolean>;
}

let organizationService: ReturnType<typeof OrganizationService>;
let organizationRepository: DeepMockProxy<OrganizationRepository>;
let memberRepository: DeepMockProxy<MemberRepositoryMock>;
let userService: DeepMockProxy<UserService>;

describe("OrganizationService", () => {
	beforeEach(() => {
		organizationRepository = mockDeep<OrganizationRepository>();
		memberRepository = mockDeep<MemberRepositoryMock>();
		userService = mockDeep<UserService>();
		organizationService = OrganizationService({
			organizationRepository,
			memberRepository,
			userService,
		});
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
				expectedError: string;
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
					expectedError: PermissionDeniedError.name,
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
					expectedError: InvalidArgumentError.name,
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
					expectedError: InvalidArgumentError.name,
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
					userService.get.mockResolvedValue(state.user);
					memberRepository.hasRole.mockResolvedValue(state.role !== null);

					/**
					 * Act and assert
					 *
					 * We call the update method with the user ID, organization ID, and the
					 * new organization name.
					 */
					const { organizationId, name, description } = input;
					try {
						await organizationService.organizations.update(
							makeMockContext(state.user),
							organizationId,
							{
								name,
								description,
							},
						);
						fail("Expected to throw");
					} catch (err) {
						assert(err instanceof Error);
						expect(err.name).toBe(expectedError);
					}
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
					userService.get.mockResolvedValue(state.user);
					memberRepository.hasRole.mockResolvedValue(state.role !== null);

					/**
					 * Act
					 *
					 * We call the update method with the user ID, organization ID, and the
					 * new organization name.
					 */
					const { organizationId, name, description } = input;
					const actual = organizationService.organizations.update(
						makeMockContext(state.user),
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
				expectedError: typeof KnownDomainError.name;
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
					expectedError: InvalidArgumentError.name,
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
					expectedError: InvalidArgumentError.name,
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
					expectedError: InvalidArgumentError.name,
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
					userService.get.mockResolvedValueOnce(state.user);
					const { userId, ...rest } = input;

					/**
					 * Act and assert
					 *
					 * We call the update method with the user ID, organization ID, and the
					 * new organization name.
					 */
					try {
						await organizationService.organizations.create(
							makeMockContext({ id: userId }),
							rest,
						);
						fail("Expected to throw");
					} catch (err) {
						assert(err instanceof Error);
						expect(err.name).toBe(expectedError);
					}
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
					userService.get.mockResolvedValueOnce(state.user);
					const { userId, ...rest } = input;

					/**
					 * Act
					 *
					 * We call the update method with the user ID, organization ID, and the
					 * new organization name.
					 */
					const actual = organizationService.organizations.create(
						makeMockContext({ id: userId }),
						rest,
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
					expect(organizationRepository.create).toHaveBeenCalledWith({
						userId,
						...rest,
					});
				},
			);
		});
	});

	describe("getMembers", () => {
		it("should get members of the organization", async () => {
			/**
			 * Arrange.
			 *
			 * Set up the mock user and hasRole implementation.
			 */
			userService.get.mockResolvedValueOnce(
				mock<User>({ id: "1", isSuperUser: false }),
			);
			memberRepository.hasRole.mockImplementation(
				getMockHasRoleImplementation({
					userId: "1",
					organizationId: "2",
					role: Role.MEMBER,
				}),
			);

			const actual = organizationService.members.findMany(
				makeMockContext({ id: "1" }),
				{ organizationId: "2" },
			);

			// Asser that we don't throw, and that the memberRepository.get method was called with the correct arguments.
			await expect(actual).resolves.not.toThrow();
		});

		it("should raise PermissionDeniedError if not a member", async () => {
			/**
			 * Arrange.
			 *
			 * Set up the mock user and hasRole implementation.
			 */
			userService.get.mockResolvedValueOnce(
				mock<User>({ id: "1", isSuperUser: false }),
			);
			memberRepository.hasRole.mockResolvedValue(false);

			const res = await organizationService.members.findMany(
				makeMockContext({ id: "1", isSuperUser: false }),
				{ organizationId: "1" },
			);
			expect(res).toEqual({
				ok: false,
				error: expect.any(PermissionDeniedError),
			});
		});

		it("should return ok: false and unauthorized error if not logged in", async () => {
			const result = await organizationService.members.findMany(
				makeMockContext(null),
				{ organizationId: faker.string.uuid() },
			);
			expect(result).toEqual({
				ok: false,
				error: expect.any(UnauthorizedError),
			});
		});
	});

	describe("get", () => {
		it("should get the organization", async () => {
			organizationRepository.get.mockResolvedValueOnce(
				mock<Organization>({ id: "1" }),
			);

			const actual = organizationService.organizations.get("1");
			await expect(actual).resolves.not.toThrow();
		});
	});

	describe("findMany", () => {
		it("should get the organizations", async () => {
			organizationRepository.findMany.mockResolvedValueOnce([
				mock<Organization>({ id: "1" }),
			]);

			const actual = organizationService.organizations.findMany();
			await expect(actual).resolves.not.toThrow();
		});

		it("should get the organizations for a user", async () => {
			organizationRepository.findManyByUserId.mockResolvedValueOnce([
				mock<Organization>({ id: "1" }),
			]);

			const actual = organizationService.organizations.findMany({
				userId: faker.string.uuid(),
			});
			await expect(actual).resolves.not.toThrow();
			expect(organizationRepository.findManyByUserId).toHaveBeenCalledWith({
				userId: expect.any(String),
			});
		});
	});
});

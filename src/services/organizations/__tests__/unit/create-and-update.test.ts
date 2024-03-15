import { fail } from "node:assert";
import { faker } from "@faker-js/faker";
import { type DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import { UnauthorizedError } from "~/domain/errors.js";
import {
	FeaturePermission,
	type Organization,
} from "~/domain/organizations.js";
import { makeMockContext } from "~/lib/context.js";
import {
	type MemberRepository,
	type OrganizationRepository,
	OrganizationService,
	type UserService,
} from "../../service.js";

describe("OrganizationService", () => {
	let organizationService: ReturnType<typeof OrganizationService>;
	let userService: DeepMockProxy<UserService>;
	let organizationRepository: DeepMockProxy<OrganizationRepository>;
	let memberRepository: DeepMockProxy<MemberRepository>;

	beforeAll(() => {
		userService = mockDeep<UserService>();
		organizationRepository = mockDeep<OrganizationRepository>();
		memberRepository = mockDeep<MemberRepository>();
		organizationService = OrganizationService({
			organizationRepository,
			memberRepository,
			userService,
		});
	});
	describe("create", () => {
		describe("as a super user", () => {
			it("create an organization with feature permissions", async () => {
				/**
				 * Mock the organization repository to return
				 */
				organizationRepository.create.mockResolvedValueOnce(
					mock<Organization>(),
				);

				/**
				 * Act
				 */
				const actual = organizationService.organizations.create(
					makeMockContext({ isSuperUser: true }),
					{
						name: faker.company.name(),
						description: faker.lorem.paragraph(),
						featurePermissions: [
							FeaturePermission.CABIN_ADMIN,
							FeaturePermission.ARCHIVE_WRITE_DOCUMENTS,
						],
					},
				);

				/**
				 * Assert
				 */
				await expect(actual).resolves.not.toThrow();
				expect(organizationRepository.create).toHaveBeenCalledWith({
					userId: expect.any(String),
					name: expect.any(String),
					description: expect.any(String),
					featurePermissions: [
						FeaturePermission.CABIN_ADMIN,
						FeaturePermission.ARCHIVE_WRITE_DOCUMENTS,
					],
				});
			});
		});

		describe("as a member", () => {
			it("should ignore feature permissions", async () => {
				/**
				 * Mock the organization repository to return
				 */
				organizationRepository.create.mockResolvedValueOnce(
					mock<Organization>(),
				);
				/**
				 * Mock hasRole to return true
				 */
				memberRepository.hasRole.mockResolvedValueOnce(true);
				const callerUserId = faker.string.uuid();
				/**
				 * Act
				 */
				const actual = organizationService.organizations.create(
					makeMockContext({ id: callerUserId }),
					{
						name: faker.company.name(),
						description: faker.lorem.paragraph(),
						featurePermissions: [
							FeaturePermission.CABIN_ADMIN,
							FeaturePermission.ARCHIVE_WRITE_DOCUMENTS,
						],
					},
				);

				/**
				 * Assert
				 */
				await expect(actual).resolves.not.toThrow();
				expect(organizationRepository.create).toHaveBeenCalledWith({
					userId: callerUserId,
					name: expect.any(String),
					description: expect.any(String),
					featurePermissions: undefined,
				});
			});
		});

		it("should raise UnauthorizedError if not logged in", async () => {
			/**
			 * Act
			 */
			try {
				await organizationService.organizations.create(makeMockContext(null), {
					name: faker.company.name(),
					description: faker.lorem.paragraph(),
					featurePermissions: [
						FeaturePermission.CABIN_ADMIN,
						FeaturePermission.ARCHIVE_WRITE_DOCUMENTS,
					],
				});
				fail("Expected an error");
			} catch (err) {
				/**
				 * Assert
				 */
				expect(err).toBeInstanceOf(UnauthorizedError);
			}
		});
	});

	describe("update", () => {
		describe("as a super user", () => {
			it("update an organization with feature permissions", async () => {
				/**
				 * Mock the organization repository to return
				 */
				organizationRepository.update.mockResolvedValueOnce(
					mock<Organization>(),
				);

				/**
				 * Act
				 */
				const actual = organizationService.organizations.update(
					makeMockContext({ isSuperUser: true }),
					faker.string.uuid(),
					{
						name: faker.company.name(),
						description: null,
						featurePermissions: [
							FeaturePermission.CABIN_ADMIN,
							FeaturePermission.ARCHIVE_WRITE_DOCUMENTS,
						],
					},
				);

				/**
				 * Assert
				 */
				await expect(actual).resolves.not.toThrow();
				expect(organizationRepository.update).toHaveBeenCalledWith(
					expect.any(String),
					{
						name: expect.any(String),
						description: undefined,
						featurePermissions: [
							FeaturePermission.CABIN_ADMIN,
							FeaturePermission.ARCHIVE_WRITE_DOCUMENTS,
						],
					},
				);
			});
		});

		describe("as a member", () => {
			it("should ignore feature permissions", async () => {
				/**
				 * Mock the organization repository to return
				 */
				organizationRepository.update.mockResolvedValueOnce(
					mock<Organization>(),
				);
				/**
				 * Mock hasRole to return true
				 */
				memberRepository.hasRole.mockResolvedValueOnce(true);

				/**
				 * Act
				 */
				const actual = organizationService.organizations.update(
					makeMockContext({ id: faker.string.uuid() }),
					faker.string.uuid(),
					{
						name: faker.company.name(),
						description: null,
						featurePermissions: [
							FeaturePermission.CABIN_ADMIN,
							FeaturePermission.ARCHIVE_WRITE_DOCUMENTS,
						],
					},
				);

				/**
				 * Assert
				 */
				await expect(actual).resolves.not.toThrow();
				expect(organizationRepository.update).toHaveBeenCalledWith(
					expect.any(String),
					{
						name: expect.any(String),
						description: undefined,
						featurePermissions: undefined,
					},
				);
			});
		});

		it("should raise UnauthorizedError if not logged in", async () => {
			/**
			 * Act
			 */
			try {
				await organizationService.organizations.update(
					makeMockContext(null),
					faker.string.uuid(),
					{
						name: faker.company.name(),
						description: faker.lorem.paragraph(),
						featurePermissions: [
							FeaturePermission.CABIN_ADMIN,
							FeaturePermission.ARCHIVE_WRITE_DOCUMENTS,
						],
					},
				);
				fail("Expected an error");
			} catch (err) {
				/**
				 * Assert
				 */
				expect(err).toBeInstanceOf(UnauthorizedError);
			}
		});
	});
});

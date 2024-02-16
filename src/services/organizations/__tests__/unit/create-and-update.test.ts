import { fail } from "assert";
import { faker } from "@faker-js/faker";
import { FeaturePermission, type Organization } from "@prisma/client";
import { type DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import { UnauthorizedError } from "~/domain/errors.js";
import { makeMockContext } from "~/lib/context.js";
import {
	type MemberRepository,
	type OrganizationRepository,
	OrganizationService,
	type PermissionService,
} from "../../service.js";

describe("OrganizationService", () => {
	let organizationService: OrganizationService;
	let permissionService: DeepMockProxy<PermissionService>;
	let organizationRepository: DeepMockProxy<OrganizationRepository>;
	let memberRepository: DeepMockProxy<MemberRepository>;

	beforeAll(() => {
		permissionService = mockDeep<PermissionService>();
		organizationRepository = mockDeep<OrganizationRepository>();
		memberRepository = mockDeep<MemberRepository>();
		organizationService = new OrganizationService(
			organizationRepository,
			memberRepository,
			permissionService,
		);
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
				const actual = organizationService.create(
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
				permissionService.hasRole.mockResolvedValueOnce(true);
				const callerUserId = faker.string.uuid();
				/**
				 * Act
				 */
				const actual = organizationService.create(
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
				await organizationService.create(makeMockContext(null), {
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
				const actual = organizationService.update(
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
				permissionService.hasRole.mockResolvedValueOnce(true);

				/**
				 * Act
				 */
				const actual = organizationService.update(
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
				await organizationService.update(
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

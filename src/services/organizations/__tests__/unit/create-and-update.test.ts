import { faker } from "@faker-js/faker";
import { FeaturePermission, Organization } from "@prisma/client";
import { DeepMockProxy, mock, mockDeep } from "jest-mock-extended";

import { MemberRepository, OrganizationRepository, OrganizationService, PermissionService } from "../../service.js";

describe("OrganizationService", () => {
  let organizationService: OrganizationService;
  let permissionService: DeepMockProxy<PermissionService>;
  let organizationRepository: DeepMockProxy<OrganizationRepository>;
  let memberRepository: DeepMockProxy<MemberRepository>;

  beforeAll(() => {
    permissionService = mockDeep<PermissionService>();
    organizationRepository = mockDeep<OrganizationRepository>();
    memberRepository = mockDeep<MemberRepository>();
    organizationService = new OrganizationService(organizationRepository, memberRepository, permissionService);
  });
  describe("create", () => {
    describe("as a super user", () => {
      it("create an organization with feature permissions", async () => {
        /**
         * Arrange
         *
         * Mock the permission service to return true for isSuperUser.
         */
        permissionService.isSuperUser.mockResolvedValue({ isSuperUser: true });
        /**
         * Mock the organization repository to return
         */
        organizationRepository.create.mockResolvedValueOnce(mock<Organization>());
        const callerUserId = faker.string.uuid();

        /**
         * Act
         */
        const actual = organizationService.create(callerUserId, {
          name: faker.company.name(),
          description: faker.lorem.paragraph(),
          featurePermissions: [FeaturePermission.CABIN_BOOKING, FeaturePermission.ARCHIVE],
        });

        /**
         * Assert
         */
        await expect(actual).resolves.not.toThrow();
        expect(organizationRepository.create).toHaveBeenCalledWith({
          userId: expect.any(String),
          name: expect.any(String),
          description: expect.any(String),
          featurePermissions: [FeaturePermission.CABIN_BOOKING, FeaturePermission.ARCHIVE],
        });
        expect(permissionService.isSuperUser).toHaveBeenCalledWith(callerUserId);
      });
    });

    describe("as a member", () => {
      it("should ignore feature permissions", async () => {
        /**
         * Arrange
         *
         * Mock the permission service to return true for isSuperUser.
         */
        permissionService.isSuperUser.mockResolvedValue({ isSuperUser: false });
        /**
         * Mock the organization repository to return
         */
        organizationRepository.create.mockResolvedValueOnce(mock<Organization>());
        /**
         * Mock hasRole to return true
         */
        permissionService.hasRole.mockResolvedValueOnce(true);
        const callerUserId = faker.string.uuid();
        /**
         * Act
         */
        const actual = organizationService.create(callerUserId, {
          name: faker.company.name(),
          description: faker.lorem.paragraph(),
          featurePermissions: [FeaturePermission.CABIN_BOOKING, FeaturePermission.ARCHIVE],
        });

        /**
         * Assert
         */
        await expect(actual).resolves.not.toThrow();
        expect(organizationRepository.create).toHaveBeenCalledWith({
          userId: expect.any(String),
          name: expect.any(String),
          description: expect.any(String),
          featurePermissions: undefined,
        });
        expect(permissionService.isSuperUser).toHaveBeenCalledWith(callerUserId);
      });
    });
  });

  describe("update", () => {
    describe("as a super user", () => {
      it("update an organization with feature permissions", async () => {
        /**
         * Arrange
         *
         * Mock the permission service to return true for isSuperUser.
         */
        permissionService.isSuperUser.mockResolvedValue({ isSuperUser: true });
        /**
         * Mock the organization repository to return
         */
        organizationRepository.update.mockResolvedValueOnce(mock<Organization>());

        /**
         * Act
         */
        const actual = organizationService.update(faker.string.uuid(), faker.string.uuid(), {
          name: faker.company.name(),
          description: null,
          featurePermissions: [FeaturePermission.CABIN_BOOKING, FeaturePermission.ARCHIVE],
        });

        /**
         * Assert
         */
        await expect(actual).resolves.not.toThrow();
        expect(organizationRepository.update).toHaveBeenCalledWith(expect.any(String), {
          name: expect.any(String),
          description: undefined,
          featurePermissions: [FeaturePermission.CABIN_BOOKING, FeaturePermission.ARCHIVE],
        });
      });
    });

    describe("as a member", () => {
      it("should ignore feature permissions", async () => {
        /**
         * Arrange
         *
         * Mock the permission service to return true for isSuperUser.
         */
        permissionService.isSuperUser.mockResolvedValue({ isSuperUser: false });
        /**
         * Mock the organization repository to return
         */
        organizationRepository.update.mockResolvedValueOnce(mock<Organization>());
        /**
         * Mock hasRole to return true
         */
        permissionService.hasRole.mockResolvedValueOnce(true);

        /**
         * Act
         */
        const actual = organizationService.update(faker.string.uuid(), faker.string.uuid(), {
          name: faker.company.name(),
          description: null,
          featurePermissions: [FeaturePermission.CABIN_BOOKING, FeaturePermission.ARCHIVE],
        });

        /**
         * Assert
         */
        await expect(actual).resolves.not.toThrow();
        expect(organizationRepository.update).toHaveBeenCalledWith(expect.any(String), {
          name: expect.any(String),
          description: undefined,
          featurePermissions: undefined,
        });
      });
    });
  });
});

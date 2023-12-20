import { faker } from "@faker-js/faker";
import { Listing } from "@prisma/client";
import { DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import { PermissionDeniedError } from "~/domain/errors.js";
import { Role } from "~/domain/organizations.js";
import {
  ListingRepository,
  ListingService,
  PermissionService,
} from "../../service.js";

describe("ListingService", () => {
  let listingService: ListingService;
  let listingRepository: DeepMockProxy<ListingRepository>;
  let permissionService: DeepMockProxy<PermissionService>;

  beforeAll(() => {
    listingRepository = mockDeep<ListingRepository>();
    permissionService = mockDeep<PermissionService>();
    listingService = new ListingService(listingRepository, permissionService);
  });

  describe("delete", () => {
    it("Should delete the listing", async () => {
      /**
       * Arrange
       *
       * Mock the listing repository to return a listing,
       * and the permission service to return true
       */
      const userId = faker.string.uuid();
      const listingId = faker.string.uuid();
      const organizationId = faker.string.uuid();
      listingRepository.get.mockResolvedValueOnce(
        mock<Listing>({ organizationId }),
      );
      listingRepository.delete.mockResolvedValueOnce(mock<Listing>());
      permissionService.hasRole.mockResolvedValueOnce(true);

      /**
       * Act
       *
       * Call delete and assert that it does not throw
       */
      await expect(
        listingService.delete(userId, listingId),
      ).resolves.not.toThrow();
      expect(listingRepository.delete).toHaveBeenCalledWith(listingId);
    });

    describe("permissions", () => {
      it("should pass the correct arguments to hasRole", async () => {
        /**
         * Arrange
         *
         * Mock the permission check to true
         */
        const userId = faker.string.uuid();
        const organizationId = faker.string.uuid();
        permissionService.hasRole.mockResolvedValue(true);
        listingRepository.get.mockResolvedValueOnce(
          mock<Listing>({ organizationId }),
        );

        /**
         * Act
         *
         * Call delete and assert that it does not throw
         */
        await expect(
          listingService.delete(userId, faker.string.uuid()),
        ).resolves.not.toThrow();

        /**
         * Assert
         *
         * Has role should have been called with userId and organizationId
         */
        expect(permissionService.hasRole).toHaveBeenCalledWith({
          userId,
          organizationId,
          role: Role.MEMBER,
        });
      });

      it("should raise PermissionDeniedError if the user does not have the role", async () => {
        /**
         * Arrange
         *
         * Mock the permission check to true
         */
        const userId = faker.string.uuid();
        permissionService.hasRole.mockResolvedValue(false);
        listingRepository.get.mockResolvedValueOnce(
          mock<Listing>({ organizationId: faker.string.uuid() }),
        );

        /**
         * Act
         *
         * Call delete, assert that it throws
         */
        await expect(
          listingService.delete(userId, faker.string.uuid()),
        ).rejects.toThrow(PermissionDeniedError);

        /**
         * Assert
         *
         * Delete should not have been called
         */
        expect(listingRepository.delete).not.toHaveBeenCalled();
      });
    });
  });
});

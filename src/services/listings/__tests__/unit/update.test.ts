import { faker } from "@faker-js/faker";
import { Listing } from "@prisma/client";
import { DeepMockProxy, mock, mockDeep } from "jest-mock-extended";

import { InvalidArgumentError, PermissionDeniedError } from "@/domain/errors.js";
import { Role } from "@/domain/organizations.js";

import { ListingRepository, ListingService, PermissionService } from "../../service.js";

describe("ListingService", () => {
  let listingService: ListingService;
  let listingRepository: DeepMockProxy<ListingRepository>;
  let permissionService: DeepMockProxy<PermissionService>;

  beforeAll(() => {
    listingRepository = mockDeep<ListingRepository>();
    permissionService = mockDeep<PermissionService>();
    listingService = new ListingService(listingRepository, permissionService);
  });

  describe("update", () => {
    describe("should raise InvalidArgumentError when", () => {
      interface TestCase {
        name: string;
        data: Partial<{
          name: string;
          closesAt: Date;
          description: string | null;
          applicationUrl: string | null;
        }>;
      }
      const testCases: TestCase[] = [
        {
          name: "name is empty",
          data: {
            name: "",
          },
        },
        {
          name: "name is too long",
          data: {
            name: faker.string.sample(101),
          },
        },
        {
          name: "closesAt is in the past",
          data: {
            closesAt: faker.date.recent(),
          },
        },
        {
          name: "applicationUrl is not a valid URL",
          data: {
            applicationUrl: faker.lorem.word(),
          },
        },
      ];

      test.each(testCases)("$name", async ({ data }) => {
        listingRepository.get.mockResolvedValueOnce(mock<Listing>({ organizationId: faker.string.uuid() }));
        permissionService.hasRole.mockResolvedValueOnce(true);

        await expect(listingService.update(faker.string.uuid(), faker.string.uuid(), data)).rejects.toThrow(
          InvalidArgumentError
        );
      });
    });

    describe("should update when", () => {
      interface TestCase {
        name: string;
        data: Partial<{
          name: string | null;
          closesAt: Date | null;
          description: string | null;
          applicationUrl: string | null;
        }>;
        expected: Partial<{
          name: string;
          closesAt: Date;
          description: string;
          applicationUrl: string;
        }>;
      }
      const testCases: TestCase[] = [
        {
          name: "all fields are updated and valid",
          data: {
            name: "test listing",
            closesAt: faker.date.future(),
            description: "test description",
            applicationUrl: "https://example.com",
          },
          expected: {
            name: "test listing",
            closesAt: expect.any(Date),
            description: "test description",
            applicationUrl: "https://example.com",
          },
        },
        {
          name: "description is null",
          data: {
            description: null,
          },
          expected: {},
        },
        {
          name: "applicationUrl is null",
          data: {
            applicationUrl: null,
          },
          expected: {},
        },
        {
          name: "nullish fields are excluded",
          data: {
            applicationUrl: null,
            description: null,
            name: null,
            closesAt: null,
          },
          expected: {},
        },
      ];

      test.each(testCases)("$name", async ({ data, expected }) => {
        /**
         * Arrange
         *
         * Set up the permission checks
         */
        listingRepository.get.mockResolvedValueOnce(mock<Listing>({ organizationId: faker.string.uuid() }));
        permissionService.hasRole.mockResolvedValueOnce(true);

        // Act
        await expect(listingService.update(faker.string.uuid(), faker.string.uuid(), data)).resolves.not.toThrow();

        /**
         * Assert
         *
         * Ensure that the permission check has been called with the correct arguments
         */
        expect(listingRepository.update).toHaveBeenCalledWith(expect.any(String), expected);
      });
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
        const data = {
          name: faker.word.adjective(),
          closesAt: faker.date.future(),
        };
        permissionService.hasRole.mockResolvedValue(true);
        listingRepository.get.mockResolvedValueOnce(mock<Listing>({ organizationId }));

        /**
         * Act
         *
         * Call update
         */
        await expect(listingService.update(userId, faker.string.uuid(), data)).resolves.not.toThrow();

        /**
         * Assert
         *
         * Has role should have been called with userId and organizationId
         */
        expect(permissionService.hasRole).toHaveBeenCalledWith({ userId, organizationId, role: Role.MEMBER });
      });

      it("should raise PermissionDeniedError if the user does not have the role", async () => {
        /**
         * Arrange
         *
         * Mock the permission check to true
         */
        const userId = faker.string.uuid();
        const data = {
          name: faker.word.adjective(),
          closesAt: faker.date.future(),
        };
        permissionService.hasRole.mockResolvedValue(false);
        listingRepository.get.mockResolvedValueOnce(mock<Listing>({ organizationId: faker.string.uuid() }));

        /**
         * Act
         *
         * Call update, assert that it throws
         */
        await expect(listingService.update(userId, faker.string.uuid(), data)).rejects.toThrow(PermissionDeniedError);

        /**
         * Assert
         *
         * Update should not have been called
         */
        expect(listingRepository.update).not.toHaveBeenCalled();
      });
    });
  });
});

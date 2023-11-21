import { faker } from "@faker-js/faker";
import { DeepMockProxy, mockDeep } from "jest-mock-extended";

import { InvalidArgumentError } from "@/domain/errors.js";

import { ListingRepository, ListingService } from "../../service.js";

describe("ListingService", () => {
  let listingService: ListingService;
  let listingRepository: DeepMockProxy<ListingRepository>;

  beforeAll(() => {
    listingRepository = mockDeep<ListingRepository>();
    listingService = new ListingService(listingRepository);
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
        await expect(listingService.update(faker.string.uuid(), data)).rejects.toThrow(InvalidArgumentError);
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
        await expect(listingService.update(faker.string.uuid(), data)).resolves.not.toThrow();
        expect(listingRepository.update).toHaveBeenCalledWith(expect.any(String), expected);
      });
    });
  });
});

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
  describe("create", () => {
    describe("should raise InvalidArgumentError when", () => {
      interface TestCase {
        name: string;
        data: {
          name: string;
          description?: string | null;
          closesAt: Date;
          applicationUrl?: string | null;
          organizationId: string;
        };
      }
      const testCases: TestCase[] = [
        {
          name: "name is empty",
          data: {
            name: "",
            closesAt: faker.date.future(),
            organizationId: faker.string.uuid(),
          },
        },
        {
          name: "name is too long",
          data: {
            name: faker.string.sample(101),
            closesAt: faker.date.future(),
            organizationId: faker.string.uuid(),
          },
        },
        {
          name: "closesAt is in the past",
          data: {
            name: faker.word.adjective(),
            closesAt: faker.date.recent(),
            organizationId: faker.string.uuid(),
          },
        },
        {
          name: "organizationId is not a UUID",
          data: {
            name: faker.word.adjective(),
            closesAt: faker.date.recent(),
            organizationId: faker.string.sample(10),
          },
        },
        {
          name: "applicationUrl is not a valid URL",
          data: {
            name: faker.word.adjective(),
            closesAt: faker.date.recent(),
            organizationId: faker.string.uuid(),
            applicationUrl: faker.lorem.word(),
          },
        },
      ];

      test.each(testCases)("$name", async ({ data }) => {
        await expect(listingService.create(data)).rejects.toThrow(InvalidArgumentError);
      });
    });

    describe("should create when", () => {
      interface TestCase {
        name: string;
        data: {
          name: string;
          description?: string | null;
          closesAt: Date;
          applicationUrl?: string | null;
          organizationId: string;
        };
        expected: {
          name: string;
          closesAt: Date;
          organizationId: string;
          description?: string;
          applicationUrl?: string;
        };
      }
      const testCases: TestCase[] = [
        {
          name: "required fields are present",
          data: {
            name: "test listing",
            closesAt: faker.date.future(),
            organizationId: faker.string.uuid(),
          },
          expected: {
            name: "test listing",
            closesAt: expect.any(Date),
            organizationId: expect.any(String),
          },
        },
        {
          name: "applicationUrl and description are set",
          data: {
            name: "test listing",
            closesAt: faker.date.future(),
            organizationId: faker.string.uuid(),
            description: "test description",
            applicationUrl: "https://example.com",
          },
          expected: {
            name: "test listing",
            closesAt: expect.any(Date),
            organizationId: expect.any(String),
            description: "test description",
            applicationUrl: "https://example.com",
          },
        },
        {
          name: "description is null",
          data: {
            name: "test listing",
            closesAt: faker.date.future(),
            organizationId: faker.string.uuid(),
            description: null,
          },
          expected: {
            name: "test listing",
            closesAt: expect.any(Date),
            organizationId: expect.any(String),
          },
        },
        {
          name: "applicationUrl is null",
          data: {
            name: "test listing",
            closesAt: faker.date.future(),
            organizationId: faker.string.uuid(),
            applicationUrl: null,
          },
          expected: {
            name: "test listing",
            closesAt: expect.any(Date),
            organizationId: expect.any(String),
          },
        },
      ];

      test.each(testCases)("$name", async ({ data, expected }) => {
        await expect(listingService.create(data)).resolves.not.toThrow();
        expect(listingRepository.create).toHaveBeenCalledWith(expected);
      });
    });
  });
});

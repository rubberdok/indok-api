import { faker } from "@faker-js/faker";
import { DeepMockProxy, mockDeep } from "jest-mock-extended";

import { Database } from "@/core/interfaces.js";

import { OrganizationRepository } from "../../organizations.js";

let repo: OrganizationRepository;
let db: DeepMockProxy<Database>;

describe("Organizations Repository", () => {
  beforeAll(() => {
    db = mockDeep<Database>();
    repo = new OrganizationRepository(db);
    faker.seed(42);
  });

  describe("create", () => {
    describe("valid input", () => {
      const testCases: {
        name: string;
        input: { name: string; description?: string; userId: string };
      }[] = [
        {
          name: "should create a new organization with members",
          input: {
            name: "Test Organization",
            description: "Some description",
            userId: "1",
          },
        },
        {
          name: "should create a new organization without a description",
          input: {
            name: "Organization without description",
            userId: "1",
          },
        },
      ];

      test.each(testCases)("$name", async ({ input }) => {
        await repo.create(input);
        expect(db.organization.create).toHaveBeenCalled();
      });
    });

    describe("invalid input", () => {
      const testCases = [
        {
          name: "should error if the name is too long",
          input: {
            name: faker.string.alphanumeric(101),
            userId: "1",
          },
        },
        {
          name: "should error if the description is too long",
          input: {
            name: faker.company.name(),
            description: faker.string.alphanumeric(10001),
            userId: "1",
          },
        },
        {
          name: "should error if userId is blank",
          input: {
            name: faker.company.name(),
            userId: "",
          },
        },
      ];

      test.each(testCases)("$name", async ({ input }) => {
        expect(repo.create(input)).rejects.toThrowError();
        expect(db.organization.create).toBeCalledTimes(0);
      });
    });
  });
});

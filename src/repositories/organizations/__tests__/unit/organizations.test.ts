import { faker } from "@faker-js/faker";
import { OrganizationRepository } from "../../index.js";
import { DeepMockProxy, mockDeep } from "jest-mock-extended";
import { Database } from "@/core/interfaces.js";
import { Member, Event } from "@prisma/client";

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
        input: { name: string; description?: string };
        expected: { id: string; name: string; description: string; events: Event[]; members: Member[] };
      }[] = [
        {
          name: "should create a new organization",
          input: {
            name: "Test Organization",
            description: "Some description",
          },
          expected: {
            id: "3",
            name: "Test Organization",
            description: "Some description",
            events: [],
            members: [],
          },
        },
        {
          name: "should create a new organization without a description",
          input: {
            name: "Organization without description",
          },
          expected: {
            id: "2",
            name: "Organization without description",
            description: "",
            events: [],
            members: [],
          },
        },
      ];

      test.each(testCases)("$name", async ({ input, expected }) => {
        db.organization.create.calledWith({ data: input });
        db.organization.create.mockResolvedValueOnce(expected);

        const actual = await repo.create(input);
        expect(actual).toEqual(expected);
      });
    });

    describe("invalid input", () => {
      const testCases = [
        {
          name: "should error if the name is too long",
          input: {
            name: faker.string.alphanumeric(101),
          },
        },
        {
          name: "should error if the description is too long",
          input: {
            name: faker.company.name(),
            description: faker.string.alphanumeric(10001),
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

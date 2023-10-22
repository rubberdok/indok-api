import { InvalidArgumentError, NotFoundError } from "@/core/errors.js";
import prisma from "@/lib/prisma.js";
import { faker } from "@faker-js/faker";
import { Organization, Role } from "@prisma/client";
import { OrganizationRepository } from "../../organizations.js";

let organizationRepository: OrganizationRepository;

describe("OrganizationsRepository", () => {
  beforeAll(async () => {
    organizationRepository = new OrganizationRepository(prisma);
  });

  describe("create", () => {
    it("should create a new organization with the user as an admin", async () => {
      /**
       * Arrange
       *
       * 1. Create a user with userId {userId}
       */
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          feideId: faker.string.uuid(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          username: faker.internet.userName(),
        },
      });

      /**
       * Act
       *
       * 1. Create a new organization with the user.
       */
      const organization = await organizationRepository.create({
        name: faker.company.name(),
        userId: user.id,
      });

      /**
       * Assert
       * 1. The organization should have the user as a member.
       */
      await expect(
        prisma.member.findUniqueOrThrow({
          where: {
            userId_organizationId: {
              userId: user.id,
              organizationId: organization.id,
            },
          },
        })
      ).resolves.toEqual({
        id: expect.any(String),
        role: Role.ADMIN,
        userId: user.id,
        organizationId: organization.id,
      });
    });

    it("should raise InvalidArgumentError for duplicate organization names", async () => {
      /**
       * Arrange
       *
       * 1. Create a user with userId {userId}
       * 2. Createa an organization with name {name}
       */
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          feideId: faker.string.uuid(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          username: faker.internet.userName(),
        },
      });
      const duplicateName = faker.company.name();
      const organization = await prisma.organization.create({
        data: {
          name: duplicateName,
        },
      });

      /**
       * Act
       *
       * 1. Create a new organization with the same {name} which should violate
       * the unique name constraint
       */
      await expect(
        organizationRepository.create({
          name: duplicateName,
          userId: user.id,
        })
      ).rejects.toThrow(InvalidArgumentError);
    });

    it("should create a new organization with name and description", async () => {
      /**
       * Arrange
       *
       * 1. Create a user with userId {userId}
       */
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          feideId: faker.string.uuid(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          username: faker.internet.userName(),
        },
      });

      /**
       * Act
       *
       * 1. Create a new organization with the user and a random name and description
       */
      const name = faker.company.name();
      const description = faker.company.catchPhrase();

      // Assert that the organization has the given name and description
      await expect(
        organizationRepository.create({
          name,
          description,
          userId: user.id,
        })
      ).resolves.toEqual({
        id: expect.any(String),
        name,
        description,
      });
    });

    it("should raise InvalidArgumentError if the userId is empty", async () => {
      // Act and assert
      await expect(
        organizationRepository.create({
          name: faker.company.name(),
          userId: "",
        })
      ).rejects.toThrow(InvalidArgumentError);
    });
  });

  describe("update", () => {
    interface TestCase {
      name: string;
      data: {
        name?: string;
        description?: string;
      };
      expected: Partial<Organization>;
    }

    const testCases: TestCase[] = [
      {
        name: "should update the organization name",
        data: {
          name: faker.company.name(),
        },
        expected: {
          id: expect.any(String),
          description: expect.any(String),
        },
      },
      {
        name: "should update the description",
        data: {
          description: faker.company.catchPhrase(),
        },
        expected: {
          id: expect.any(String),
          name: expect.any(String),
        },
      },
      {
        name: "should not update undefined values",
        data: {},
        expected: {
          id: expect.any(String),
          name: expect.any(String),
          description: expect.any(String),
        },
      },
    ];
    test.each(testCases)("$name, $data", async ({ data, expected }) => {
      /**
       * Arrange
       *
       * 1. Create an organization random {name} and random {description}
       */
      const organization = await prisma.organization.create({
        data: {
          name: faker.company.name(),
          description: faker.lorem.paragraph(),
        },
      });

      /**
       * Act
       *
       * Update the organization with {data}
       */
      const result = organizationRepository.update(organization.id, data);

      /**
       * Assert
       *
       * Check that the organization has been updated with {data} and now matches
       * {expected}, leaving undefined values unchanged.
       */
      await expect(result).resolves.toEqual({
        ...expected,
        ...data,
      });
    });
  });

  describe("get", () => {
    it("should return the organization with the given ID", async () => {
      /**
       * Arrange
       *
       * 1. Create an organization with a random name and description
       */
      const organization = await prisma.organization.create({
        data: {
          name: faker.company.name(),
          description: faker.company.catchPhrase(),
        },
      });

      /**
       * Act
       *
       * Get the organization with the ID of the organization
       */
      const result = organizationRepository.get(organization.id);

      /**
       * Assert
       *
       * Should return the organization with the given ID
       */
      await expect(result).resolves.toEqual(organization);
    });

    it("should raise a NotFoundError if the organization does not exist", async () => {
      /**
       * Act
       *
       * Try to get a non-existing organization
       */
      const result = organizationRepository.get(faker.string.uuid());

      /**
       * Assert
       *
       * Should raise a NotFoundError
       */
      await expect(result).rejects.toThrow(NotFoundError);
    });
  });

  describe("findMany", () => {
    it("should return all organizations", async () => {
      const expected = [
        { id: expect.any(String), name: faker.company.name(), description: expect.any(String) },
        { id: expect.any(String), name: faker.company.name(), description: expect.any(String) },
        { id: expect.any(String), name: faker.company.name(), description: expect.any(String) },
      ];
      /**
       * Arrange
       *
       * 1. Create 3 organizations
       */
      await prisma.organization.createMany({
        data: expected.map((organization) => ({ name: organization.name })),
      });

      /**
       * Act
       *
       * Get all organizations
       */
      const result = organizationRepository.findMany();

      /**
       * Assert
       *
       * Should return all organizations
       */
      await expect(result).resolves.toEqual(expect.arrayContaining(expected));
    });
  });
});

import { faker } from "@faker-js/faker";

import { NotFoundError } from "@/domain/errors.js";
import { Role } from "@/domain/organizations.js";
import prisma from "@/lib/prisma.js";

import { MemberRepository } from "../../members.js";

let repo: MemberRepository;

describe("MembersRepository", () => {
  beforeAll(async () => {
    repo = new MemberRepository(prisma);
  });

  beforeAll(async () => {
    await prisma.organization.upsert({
      create: {
        id: "org1",
        name: faker.company.name(),
      },
      update: {
        members: { deleteMany: {} },
      },
      where: {
        id: "org1",
      },
    });
    await prisma.organization.upsert({
      create: {
        id: "org2",
        name: faker.company.name(),
      },
      update: {
        members: { deleteMany: {} },
      },
      where: {
        id: "org2",
      },
    });
  });

  describe("create", () => {
    it("should create a new member with role 'Member'", async () => {
      await prisma.user.upsert({
        create: {
          id: "user1",
          feideId: faker.string.uuid(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          email: faker.internet.email(),
          username: faker.internet.userName(),
        },
        update: {
          memberships: {
            deleteMany: {},
          },
        },
        where: {
          id: "user1",
        },
      });
      const expected = {
        id: expect.any(String),
        userId: "user1",
        organizationId: "org1",
        role: Role.MEMBER,
        updatedAt: expect.any(Date),
        createdAt: expect.any(Date),
      };
      const actual = repo.create({ userId: "user1", organizationId: "org1" });
      expect(actual).resolves.toEqual(expected);
    });

    it("should create a new member with role 'Admin'", async () => {
      await prisma.user.upsert({
        create: {
          id: "user2",
          feideId: faker.string.uuid(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          email: faker.internet.email(),
          username: faker.internet.userName(),
        },
        update: {
          memberships: {
            deleteMany: {},
          },
        },
        where: {
          id: "user2",
        },
      });
      const expected = {
        id: expect.any(String),
        userId: "user2",
        organizationId: "org1",
        role: Role.ADMIN,
        updatedAt: expect.any(Date),
        createdAt: expect.any(Date),
      };

      const actual = repo.create({ userId: "user2", organizationId: "org1", role: Role.ADMIN });
      expect(actual).resolves.toEqual(expected);
    });

    it("should disallow multiple memberships in the same organization", async () => {
      // Seed a user with an pre-existing membership in the organization org1
      await prisma.user.upsert({
        create: {
          id: "user3",
          feideId: faker.string.uuid(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          email: faker.internet.email(),
          username: faker.internet.userName(),
          memberships: {
            create: {
              organization: {
                connectOrCreate: {
                  where: {
                    id: "org1",
                  },
                  create: {
                    name: faker.company.name(),
                  },
                },
              },
            },
          },
        },
        update: {
          memberships: {
            create: {
              organization: {
                connectOrCreate: {
                  where: {
                    id: "org1",
                  },
                  create: {
                    name: faker.company.name(),
                  },
                },
              },
            },
          },
        },
        where: {
          id: "user3",
        },
      });

      const actual = repo.create({ userId: "user3", organizationId: "org1", role: Role.ADMIN });
      expect(actual).rejects.toThrowError();
    });
  });

  describe("findMany", () => {
    const id1 = faker.string.uuid();
    const id2 = faker.string.uuid();
    const id3 = faker.string.uuid();

    beforeAll(async () => {
      await prisma.organization.upsert({
        create: {
          id: "org3",
          name: faker.company.name(),
        },
        update: {
          members: { deleteMany: {} },
        },
        where: {
          id: "org3",
        },
      });
      await prisma.organization.upsert({
        create: {
          id: "org4",
          name: faker.company.name(),
        },
        update: {
          members: { deleteMany: {} },
        },
        where: {
          id: "org4",
        },
      });
      await prisma.user.upsert({
        create: {
          id: "user4",
          feideId: faker.string.uuid(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          email: faker.internet.email(),
          username: faker.internet.userName(),
          memberships: {
            connectOrCreate: {
              where: {
                id: id1,
              },
              create: {
                id: id1,
                organizationId: "org3",
              },
            },
          },
        },
        update: {
          memberships: {
            connectOrCreate: {
              where: {
                id: id1,
              },
              create: {
                id: id1,
                organizationId: "org3",
              },
            },
          },
        },
        where: {
          id: "user4",
        },
      });
      await prisma.user.upsert({
        create: {
          id: "user5",
          feideId: faker.string.uuid(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          email: faker.internet.email(),
          username: faker.internet.userName(),
          memberships: {
            connectOrCreate: {
              where: {
                id: id2,
              },
              create: {
                id: id2,
                organizationId: "org3",
              },
            },
          },
        },
        update: {
          memberships: {
            connectOrCreate: {
              where: {
                id: id2,
              },
              create: {
                id: id2,
                organizationId: "org3",
              },
            },
          },
        },
        where: {
          id: "user5",
        },
      });
      await prisma.member.upsert({
        where: {
          id: id3,
        },
        create: {
          id: id3,
          userId: "user5",
          organizationId: "org4",
          role: Role.ADMIN,
        },
        update: {},
      });
    });

    const testCases = [
      {
        name: "should return all members in an organization",
        input: {
          organizationId: "org3",
        },
        expected: [
          {
            id: id1,
            userId: expect.any(String),
            organizationId: expect.any(String),
            role: Role.MEMBER,
            updatedAt: expect.any(Date),
            createdAt: expect.any(Date),
          },
          {
            id: id2,
            userId: expect.any(String),
            organizationId: expect.any(String),
            role: Role.MEMBER,
            updatedAt: expect.any(Date),
            createdAt: expect.any(Date),
          },
        ],
      },
      {
        name: "should return all memberhsips for a user",
        input: {
          userId: "user5",
        },
        expected: [
          {
            id: id2,
            userId: expect.any(String),
            organizationId: expect.any(String),
            role: Role.MEMBER,
            updatedAt: expect.any(Date),
            createdAt: expect.any(Date),
          },
          {
            id: id3,
            userId: expect.any(String),
            organizationId: expect.any(String),
            role: Role.ADMIN,
            updatedAt: expect.any(Date),
            createdAt: expect.any(Date),
          },
        ],
      },
    ];

    test.each(testCases)("%s", async ({ input, expected }) => {
      const actual = await repo.findMany(input);
      expect(actual).toEqual(expected);
    });
  });

  describe("hasRole", () => {
    it("should return true if the user has the given role in the organization", async () => {
      /**
       * Arrange.
       *
       * 1. Create a user with userId {userId}
       * 2. Create an organization with organizationId {organizationId}
       * 3. Create a membership with id {id} for the user {userId} in the organization {organizationId}
       */
      // 1.
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          feideId: faker.string.uuid(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          username: faker.internet.userName(),
        },
      });
      // 2.
      const org = await prisma.organization.create({
        data: {
          name: faker.company.name(),
        },
      });
      // 3.
      const member = await prisma.member.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: Role.MEMBER,
        },
      });

      await expect(
        repo.hasRole({
          userId: user.id,
          organizationId: org.id,
          role: member.role,
        })
      ).resolves.toBe(true);
    });

    it("should return false if the user does not have the given role in the organization", async () => {
      /**
       * Arrange.
       * 1. Create a user with userId {userId}
       * 2. Create an organization with organizationId {organizationId1}
       * 3. Create an organization with organizationId {organizationId2}
       * 4. Create a membership with id {id} for the user {userId} in the organization {organizationId1}
       */
      // 1.
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          feideId: faker.string.uuid(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          username: faker.internet.userName(),
        },
      });
      // 2.
      const org1 = await prisma.organization.create({
        data: {
          name: faker.company.name(),
        },
      });
      // 3.
      const org2 = await prisma.organization.create({
        data: {
          name: faker.company.name(),
        },
      });
      // 4.
      const member = await prisma.member.create({
        data: {
          userId: user.id,
          organizationId: org1.id,
          role: Role.MEMBER,
        },
      });

      /**
       * Act and assert
       *
       * User {userId} does not have the role {member.role} in the organization {organizationId2},
       * only in the organization {organizationId1}.
       *
       * Expect the method to resolve to false.
       */
      await expect(
        repo.hasRole({
          userId: user.id,
          organizationId: org2.id,
          role: member.role,
        })
      ).resolves.toBe(false);
    });
  });

  describe("get", () => {
    it("should return a membership by ID", async () => {
      /**
       * Arrange.
       * 1. Create a user with userId {userId}
       * 2. Create an organization with organizationId {organizationId}
       * 3. Create a membership with id {id} for the user {userId} in the organization {organizationId}
       */

      // 1.
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          feideId: faker.string.uuid(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          username: faker.internet.userName(),
        },
      });
      // 2.
      const organization = await prisma.organization.create({
        data: {
          name: faker.company.name(),
        },
      });
      // 3.
      const member = await prisma.member.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: Role.MEMBER,
        },
      });

      // Act and assert
      await expect(repo.get({ id: member.id })).resolves.toEqual(member);
    });

    it("should return a membership by userId and organizationId", async () => {
      /**
       * Arrange.
       * 1. Create a user with userId {userId}
       * 2. Create an organization with organizationId {organizationId}
       * 3. Create a membership with id {id} for the user {userId} in the organization {organizationId}
       */

      // 1.
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          feideId: faker.string.uuid(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          username: faker.internet.userName(),
        },
      });
      // 2.
      const organization = await prisma.organization.create({
        data: {
          name: faker.company.name(),
        },
      });
      // 3.
      const member = await prisma.member.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: Role.MEMBER,
        },
      });

      // Act and assert
      await expect(repo.get({ userId: user.id, organizationId: organization.id })).resolves.toEqual(member);
    });

    it("should raise a NotFoundError if the membership does not exist", async () => {
      await expect(repo.get({ id: faker.string.uuid() })).rejects.toThrow(NotFoundError);
    });
  });
});

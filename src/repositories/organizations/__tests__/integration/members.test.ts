import { faker } from "@faker-js/faker";
import { Role } from "@prisma/client";

import prisma from "@/lib/prisma.js";

import { MemberRepository } from "../../members.js";

let repo: MemberRepository;

describe("Organizations Repository", () => {
  beforeAll(() => {
    repo = new MemberRepository(prisma);
    faker.seed(42);
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
          },
          {
            id: id2,
            userId: expect.any(String),
            organizationId: expect.any(String),
            role: Role.MEMBER,
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
          },
          {
            id: id3,
            userId: expect.any(String),
            organizationId: expect.any(String),
            role: Role.ADMIN,
          },
        ],
      },
    ];

    test.each(testCases)("%s", async ({ input, expected }) => {
      const actual = await repo.findMany(input);
      expect(actual).toEqual(expected);
    });
  });
});

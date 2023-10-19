import { faker } from "@faker-js/faker";
import { Role } from "@prisma/client";

import prisma from "@/lib/prisma.js";

import { MemberRepository } from "../../index.js";

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
});

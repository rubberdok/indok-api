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

  describe("create", () => {
    it("should create a new member with role 'Member'", async () => {
      /**
       * Arrange
       *
       * 1. Create a user with userId {userId}
       * 2. Create an organization with organizationId {organizationId}
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

      /**
       * Act and assert
       *
       * The membership should be created
       */
      const expected = {
        id: expect.any(String),
        userId: user.id,
        organizationId: org.id,
        role: Role.MEMBER,
        updatedAt: expect.any(Date),
        createdAt: expect.any(Date),
      };
      const actual = repo.create({ userId: user.id, organizationId: org.id });
      expect(actual).resolves.toEqual(expected);
    });

    it("should create a new member with role 'Admin'", async () => {
      /**
       * Arrange
       *
       * 1. Create a user with userId {userId}
       * 2. Create an organization with organizationId {organizationId}
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
      const expected = {
        id: expect.any(String),
        userId: user.id,
        organizationId: org.id,
        role: Role.ADMIN,
        updatedAt: expect.any(Date),
        createdAt: expect.any(Date),
      };

      /**
       * Act and assert
       *
       * The membership should be created
       */
      const actual = repo.create({ userId: user.id, organizationId: org.id, role: Role.ADMIN });
      expect(actual).resolves.toEqual(expected);
    });

    it("should disallow multiple memberships in the same organization", async () => {
      /**
       * Arrange
       *
       * 1. Create an organization with organizationId {organizationId}
       * 2. Create a user with userId {userId}
       * 3. Create a membership with id {id} for the user {userId} in the organization {organizationId}
       */
      // 1.
      const org = await prisma.organization.create({
        data: {
          name: faker.company.name(),
        },
      });
      //2.
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          feideId: faker.string.uuid(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          username: faker.internet.userName(),
        },
      });
      // 3.
      await prisma.member.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: Role.MEMBER,
        },
      });

      /**
       * Act and assert
       *
       * The membership should not be created
       */
      const actual = repo.create({ userId: user.id, organizationId: org.id, role: Role.ADMIN });
      expect(actual).rejects.toThrow();
    });
  });

  describe("findMany", () => {
    it("should return all memberships for a user", async () => {
      /**
       * Arrange
       *
       * 1. Create an organization with organizationId {organizationId1}
       * 2. Create an organization with organizationId {organizationId2}
       * 3. Create a user with userId {userId}
       * 4. Create a membership with id {id1} for the user {userId} in the organization {organizationId1}
       * 5. Create a membership with id {id2} for the user {userId} in the organization {organizationId2}
       */
      // 1.
      const org1 = await prisma.organization.create({
        data: {
          name: faker.company.name(),
        },
      });
      // 2.
      const org2 = await prisma.organization.create({
        data: {
          name: faker.company.name(),
        },
      });
      // 3.
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          feideId: faker.string.uuid(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          username: faker.internet.userName(),
        },
      });
      // 4.
      const member1 = await prisma.member.create({
        data: {
          userId: user.id,
          organizationId: org1.id,
          role: Role.MEMBER,
        },
      });
      // 5.
      const member2 = await prisma.member.create({
        data: {
          userId: user.id,
          organizationId: org2.id,
          role: Role.MEMBER,
        },
      });

      /**
       * Act
       * 1. Get all memberships for the user {userId}
       */
      const actual = await repo.findMany({ userId: user.id });

      /**
       * Assert
       *
       * 1. The memberships for the user {userId} should be returned
       */
      expect(actual).toEqual([member1, member2]);
    });

    it("should return all memberships for an organization", async () => {
      /**
       * Arrange
       *
       * 1. Create an organization with organizationId {organizationId1}
       * 2. Create a user with userId {userId1}
       * 3. Create a user with userId {userId2}
       * 4. Create a membership with id {id1} for the user {userId1} in the organization {organizationId1}
       * 5. Create a membership with id {id2} for the user {userId2} in the organization {organizationId1}
       */
      // 1.
      const org1 = await prisma.organization.create({
        data: {
          name: faker.company.name(),
        },
      });
      // 2.
      const user1 = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          feideId: faker.string.uuid(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          username: faker.internet.userName(),
        },
      });
      // 3.
      const user2 = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          feideId: faker.string.uuid(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          username: faker.internet.userName(),
        },
      });
      // 4.
      const member1 = await prisma.member.create({
        data: {
          userId: user1.id,
          organizationId: org1.id,
          role: Role.MEMBER,
        },
      });
      // 5.
      const member2 = await prisma.member.create({
        data: {
          userId: user2.id,
          organizationId: org1.id,
          role: Role.MEMBER,
        },
      });

      /**
       * Act
       * 1. Get all memberships for the user {userId}
       */
      const actual = await repo.findMany({ organizationId: org1.id });

      /**
       * Assert
       *
       * 1. The memberships for the user {userId} should be returned
       */
      expect(actual).toEqual([member1, member2]);
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

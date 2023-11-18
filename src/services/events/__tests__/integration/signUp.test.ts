import { faker } from "@faker-js/faker";
import { ParticipationStatus } from "@prisma/client";

import prisma from "@/lib/prisma.js";
import { EventRepository } from "@/repositories/events/repository.js";
import { MemberRepository } from "@/repositories/organizations/members.js";
import { OrganizationRepository } from "@/repositories/organizations/organizations.js";
import { UserRepository } from "@/repositories/users/index.js";
import { OrganizationService } from "@/services/organizations/service.js";
import { UserService } from "@/services/users/service.js";

import { EventService } from "../../service.js";

describe("Event Sign Up", () => {
  let eventService: EventService;

  beforeAll(() => {
    const eventRepository = new EventRepository(prisma);
    const organizationRepository = new OrganizationRepository(prisma);
    const memberRepository = new MemberRepository(prisma);
    const userService = new UserService(new UserRepository(prisma));
    const organizationService = new OrganizationService(organizationRepository, memberRepository, userService);
    eventService = new EventService(eventRepository, organizationService);
    prisma.organization.deleteMany({});
  });

  describe("signUp", () => {
    it("should sign up a user for an event with available spots", async () => {
      /**
       * Arrange.
       *
       * 1. Create an organization to host the event.
       * 2. Create an event with spots available.
       * 3. Create a slot for the event with spots available.
       * 4. Create a user to sign up for the event.
       */
      const organization = await prisma.organization.create({
        data: {
          name: faker.company.name(),
        },
      });
      const event = await prisma.event.create({
        data: {
          organizationId: organization.id,
          name: faker.color.human(),
          description: faker.lorem.paragraph(),
          startAt: "2021-01-01T00:00:00.000Z",
          endAt: "2021-01-01T01:00:00.000Z",
          spots: 1,
        },
      });

      const slot = await prisma.eventSlot.create({
        data: {
          eventId: event.id,
          spots: 1,
        },
      });

      const user = await prisma.user.create({
        data: {
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          username: faker.internet.userName(),
          feideId: faker.internet.userName(),
          email: faker.internet.email(),
        },
      });

      /**
       * Act.
       *
       * 1. Sign up the user for the event.
       */
      const actual = await eventService.signUp(user.id, event.id);

      /**
       * Assert.
       *
       * 1. User should be signed up for the event with status CONFIRMED
       */
      expect(actual.participationStatus).toEqual(ParticipationStatus.CONFIRMED);
      expect(actual.userId).toEqual(user.id);
      expect(actual.eventId).toEqual(event.id);
      expect(actual.slotId).toEqual(slot.id);
    });

    describe("should add the user to wait list when", () => {
      interface TestCase {
        eventSpots: number;
        slotSpots: number;
      }
      const testCases: TestCase[] = [
        {
          eventSpots: 0,
          slotSpots: 1,
        },
        {
          eventSpots: 1,
          slotSpots: 0,
        },
        {
          eventSpots: 0,
          slotSpots: 0,
        },
      ];
      test.each(testCases)("event spots: $eventSpots, slot spots: $slotSpots", async ({ eventSpots, slotSpots }) => {
        /**
         * Arrange.
         *
         * 1. Create an organization to host the event.
         * 2. Create an event with spots available.
         * 3. Create a slot for the event with spots available.
         * 4. Create a user to sign up for the event.
         */
        const organization = await prisma.organization.create({
          data: {
            name: faker.company.name(),
          },
        });
        const event = await prisma.event.create({
          data: {
            organizationId: organization.id,
            name: faker.color.human(),
            description: faker.lorem.paragraph(),
            startAt: "2021-01-01T00:00:00.000Z",
            endAt: "2021-01-01T01:00:00.000Z",
            spots: eventSpots,
          },
        });

        await prisma.eventSlot.create({
          data: {
            eventId: event.id,
            spots: slotSpots,
          },
        });

        const user = await prisma.user.create({
          data: {
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            username: faker.internet.userName(),
            feideId: faker.internet.userName(),
            email: faker.internet.email(),
          },
        });

        /**
         * Act.
         *
         * 1. Sign up the user for the event.
         */
        const actual = await eventService.signUp(user.id, event.id);

        /**
         * Assert.
         *
         * 1. User should be signed up for the event with status CONFIRMED
         */
        expect(actual.participationStatus).toEqual(ParticipationStatus.ON_WAITLIST);
        expect(actual.userId).toEqual(user.id);
        expect(actual.eventId).toEqual(event.id);
        expect(actual.slotId).toBeNull();
      });
    });

    it("should handle multiple concurrent sign ups", async () => {
      /**
       * Arrange.
       *
       * 1. Create an organization to host the event.
       * 2. Create an event with spots available.
       * 3. Create a slot for the event with spots available.
       * 4. Create a user to sign up for the event.
       */
      const concurrentUsers = 2_000;

      const organization = await prisma.organization.create({
        data: {
          name: faker.company.name(),
        },
      });
      const event = await prisma.event.create({
        data: {
          organizationId: organization.id,
          name: faker.color.human(),
          description: faker.lorem.paragraph(),
          startAt: "2021-01-01T00:00:00.000Z",
          endAt: "2021-01-01T01:00:00.000Z",
          spots: concurrentUsers,
        },
      });

      const slot = await prisma.eventSlot.create({
        data: {
          eventId: event.id,
          spots: concurrentUsers,
        },
      });

      await prisma.user.createMany({
        data: Array(concurrentUsers)
          .fill(null)
          .map(() => getCreateUserData()),
        skipDuplicates: true,
      });

      const users = await prisma.user.findMany({ take: concurrentUsers });

      /**
       * Act.
       *
       * Sign up all users for the event.
       */
      const promises = users.map((user) => eventService.signUp(user.id, event.id));
      const actual = await Promise.all(promises);

      /**
       * Assert.
       *
       * All users should be signed up for the event with status CONFIRMED.
       * The event should have 0 spots left.
       * The slot should have 0 spots left.
       */
      expect(actual.length).toEqual(concurrentUsers);
      expect(actual.every((signUp) => signUp.participationStatus === ParticipationStatus.CONFIRMED)).toBe(true);

      const updatedEvent = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
      expect(updatedEvent.spots).toEqual(0);

      const updatedSlot = await prisma.eventSlot.findUniqueOrThrow({ where: { id: slot.id } });
      expect(updatedSlot.spots).toEqual(0);
    });

    it("should not overfill the event", async () => {
      /**
       * Arrange.
       *
       * 1. Create an organization to host the event.
       * 2. Create an event with spots available.
       * 3. Create a slot for the event with spots available.
       * 4. Create a user to sign up for the event.
       */
      const concurrentUsers = 2_000;
      const availableSpots = 200;
      const organization = await prisma.organization.create({
        data: {
          name: faker.company.name(),
        },
      });
      const event = await prisma.event.create({
        data: {
          organizationId: organization.id,
          name: faker.color.human(),
          description: faker.lorem.paragraph(),
          startAt: "2021-01-01T00:00:00.000Z",
          endAt: "2021-01-01T01:00:00.000Z",
          spots: availableSpots,
        },
      });

      const slot = await prisma.eventSlot.create({
        data: {
          eventId: event.id,
          spots: availableSpots,
        },
      });

      await prisma.user.createMany({
        data: Array(concurrentUsers)
          .fill(null)
          .map(() => getCreateUserData()),
        skipDuplicates: true,
      });

      const users = await prisma.user.findMany({ take: concurrentUsers });

      /**
       * Act.
       *
       * Sign up all users for the event.
       */
      const promises = users.map((user) => eventService.signUp(user.id, event.id));
      const actual = await Promise.all(promises);

      /**
       * Assert.
       *
       * All users should be signed up for the event with status CONFIRMED.
       * The event should have 0 spots left.
       * The slot should have 0 spots left.
       */
      expect(actual.length).toEqual(concurrentUsers);
      expect(actual.filter((signUp) => signUp.participationStatus === ParticipationStatus.CONFIRMED).length).toEqual(
        availableSpots
      );
      expect(actual.filter((signUp) => signUp.participationStatus === ParticipationStatus.ON_WAITLIST).length).toEqual(
        concurrentUsers - availableSpots
      );

      const updatedEvent = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
      expect(updatedEvent.spots).toEqual(0);

      const updatedSlot = await prisma.eventSlot.findUniqueOrThrow({ where: { id: slot.id } });
      expect(updatedSlot.spots).toEqual(0);
    });
  });

  afterAll(() => {
    console.log("Seed:", faker.seed());
  });
});

function getCreateUserData() {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    username: faker.internet.userName(),
    feideId: faker.internet.userName(),
    email: faker.internet.email(),
  };
}

import { faker } from "@faker-js/faker";
import { ParticipationStatus } from "@prisma/client";

import prisma from "@/lib/prisma.js";

import { EventService } from "../../service.js";

import { makeDependencies } from "./dependencies-factory.js";

describe("Event Sign Up", () => {
  let eventService: EventService;

  beforeAll(() => {
    ({ eventService } = makeDependencies());
    prisma.organization.deleteMany({});
  });

  describe("signUp", () => {
    it("should sign up a user for an event with remaining capacity", async () => {
      /**
       * Arrange.
       *
       * 1. Create an organization to host the event.
       * 2. Create an event with capacity.
       * 3. Create a slot for the event with capacity.
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
          remainingCapacity: 1,
        },
      });

      const slot = await prisma.eventSlot.create({
        data: {
          eventId: event.id,
          remainingCapacity: 1,
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
        eventCapacity: number;
        slotCapacity: number;
      }
      const testCases: TestCase[] = [
        {
          eventCapacity: 0,
          slotCapacity: 1,
        },
        {
          eventCapacity: 1,
          slotCapacity: 0,
        },
        {
          eventCapacity: 0,
          slotCapacity: 0,
        },
      ];
      test.each(testCases)(
        "event capacity: $eventCapacity, slot capacity: $slotCapacity",
        async ({ eventCapacity, slotCapacity }) => {
          /**
           * Arrange.
           *
           * 1. Create an organization to host the event.
           * 2. Create an event with capacity.
           * 3. Create a slot for the event with capacity.
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
              remainingCapacity: eventCapacity,
            },
          });

          await prisma.eventSlot.create({
            data: {
              eventId: event.id,
              remainingCapacity: slotCapacity,
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
        }
      );
    });

    it("should handle multiple concurrent sign ups", async () => {
      /**
       * Arrange.
       *
       * 1. Create an organization to host the event.
       * 2. Create an event with capacity.
       * 3. Create a slot for the event with capacity.
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
          remainingCapacity: concurrentUsers,
        },
      });

      const slot = await prisma.eventSlot.create({
        data: {
          eventId: event.id,
          remainingCapacity: concurrentUsers,
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
       * The event should have 0 remaining capacity left.
       * The slot should have 0 remaining capacity left.
       */
      expect(actual.length).toEqual(concurrentUsers);
      expect(actual.every((signUp) => signUp.participationStatus === ParticipationStatus.CONFIRMED)).toBe(true);

      const updatedEvent = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
      expect(updatedEvent.remainingCapacity).toEqual(0);

      const updatedSlot = await prisma.eventSlot.findUniqueOrThrow({ where: { id: slot.id } });
      expect(updatedSlot.remainingCapacity).toEqual(0);
    }, 10_000);

    it("should not overfill the event", async () => {
      /**
       * Arrange.
       *
       * 1. Create an organization to host the event.
       * 2. Create an event with capacity.
       * 3. Create a slot for the event with capacity.
       * 4. Create a user to sign up for the event.
       */
      const concurrentUsers = 2_000;
      const capacity = 200;
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
          remainingCapacity: capacity,
        },
      });

      const slot = await prisma.eventSlot.create({
        data: {
          eventId: event.id,
          remainingCapacity: capacity,
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
       * The event should have 0 remaining capacity.
       * The slot should have 0 remaining capacity.
       */
      expect(actual.length).toEqual(concurrentUsers);
      expect(actual.filter((signUp) => signUp.participationStatus === ParticipationStatus.CONFIRMED).length).toEqual(
        capacity
      );
      expect(actual.filter((signUp) => signUp.participationStatus === ParticipationStatus.ON_WAITLIST).length).toEqual(
        concurrentUsers - capacity
      );

      const updatedEvent = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
      expect(updatedEvent.remainingCapacity).toEqual(0);

      const updatedSlot = await prisma.eventSlot.findUniqueOrThrow({ where: { id: slot.id } });
      expect(updatedSlot.remainingCapacity).toEqual(0);
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

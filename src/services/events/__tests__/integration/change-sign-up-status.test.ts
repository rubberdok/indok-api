import { faker } from "@faker-js/faker";
import { ParticipationStatus } from "@prisma/client";
import { DateTime } from "luxon";
import prisma from "~/lib/prisma.js";
import { EventService } from "../../service.js";
import { makeDependencies } from "./dependencies-factory.js";

describe("EventService", () => {
  let eventService: EventService;

  beforeAll(() => {
    ({ eventService } = makeDependencies());
  });

  describe("retractSignUp", () => {
    interface TestCase {
      name: string;
      arrange: {
        participationStatus: ParticipationStatus;
        remainingCapacity: number;
        slotId?: null;
      };
      expected: {
        slotId: null | string;
        remainingCapacity: number;
        version?: number;
        participationStatus?: ParticipationStatus;
      };
    }

    const testCases: TestCase[] = [
      {
        name: "retract confirmed sign up and increment the slot and event capacities",
        arrange: {
          participationStatus: ParticipationStatus.CONFIRMED,
          remainingCapacity: 0,
        },
        expected: {
          slotId: null,
          remainingCapacity: 1,
        },
      },
      {
        name: "retract wait list sign up and not increment the slot and event capacities",
        arrange: {
          participationStatus: ParticipationStatus.ON_WAITLIST,
          remainingCapacity: 0,
          slotId: null,
        },
        expected: {
          slotId: null,
          remainingCapacity: 0,
        },
      },
      {
        name: "not change an already retracted sign up",
        arrange: {
          participationStatus: ParticipationStatus.RETRACTED,
          remainingCapacity: 0,
          slotId: null,
        },
        expected: {
          slotId: null,
          remainingCapacity: 0,
          version: 0,
        },
      },
      {
        name: "not change an already removed sign up",
        arrange: {
          participationStatus: ParticipationStatus.REMOVED,
          remainingCapacity: 0,
          slotId: null,
        },
        expected: {
          slotId: null,
          remainingCapacity: 0,
          version: 0,
          participationStatus: ParticipationStatus.REMOVED,
        },
      },
    ];

    test.each(testCases)("should $name", async ({ arrange, expected }) => {
      /**
       * Arrange
       *
       * 1. Create an event with capacity from the arrange object
       * 2. Create a slot with capacity from the arrange object
       * 3. Create a user
       * 4. Sign up the user to the event and slot, if arrange.slotId is null, sign up to the event without a slot
       */
      const event = await prisma.event.create({
        data: {
          name: faker.word.adjective(),
          startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
          endAt: DateTime.now().plus({ days: 2 }).toJSDate(),
          remainingCapacity: arrange.remainingCapacity,
        },
      });
      const slot = await prisma.eventSlot.create({
        data: {
          eventId: event.id,
          remainingCapacity: arrange.remainingCapacity,
        },
      });
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          username: faker.string.sample(20),
          feideId: faker.string.uuid(),
        },
      });

      const signUp = await prisma.eventSignUp.create({
        data: {
          eventId: event.id,
          userId: user.id,
          slotId: arrange.slotId === null ? null : slot.id,
          participationStatus: arrange.participationStatus,
        },
      });

      /**
       * Act
       *
       * Retract the sign up
       */
      const actual = await eventService.retractSignUp(user.id, event.id);

      /**
       * Assert
       *
       * 1. Status should be retracted
       * 2. slotId should match the expected slotId
       * 3. version should be incremented
       * 4. remainingCapacity for evnet and slot should match the expected remainingCapacity
       */
      expect(actual.participationStatus).toBe(
        expected.participationStatus ?? ParticipationStatus.RETRACTED,
      );
      expect(actual.slotId).toBe(expected.slotId);
      expect(actual.version).toBe(expected.version ?? signUp.version + 1);

      const updatedSlot = await prisma.eventSlot.findUnique({
        where: { id: slot.id },
      });
      const updatedEvent = await prisma.event.findUnique({
        where: { id: event.id },
      });

      expect(updatedSlot?.remainingCapacity).toBe(expected.remainingCapacity);
      expect(updatedEvent?.remainingCapacity).toBe(expected.remainingCapacity);
    });
  });

  describe("removeSignUp", () => {
    interface TestCase {
      name: string;
      arrange: {
        participationStatus: ParticipationStatus;
        remainingCapacity: number;
        slotId?: null;
      };
      expected: {
        slotId: null | string;
        remainingCapacity: number;
        version?: number;
        participationStatus?: ParticipationStatus;
      };
    }

    const testCases: TestCase[] = [
      {
        name: "remove confirmed sign up and increment the slot and event capacities",
        arrange: {
          participationStatus: ParticipationStatus.CONFIRMED,
          remainingCapacity: 0,
        },
        expected: {
          slotId: null,
          remainingCapacity: 1,
        },
      },
      {
        name: "remove wait list sign up and not increment the slot and event capacities",
        arrange: {
          participationStatus: ParticipationStatus.ON_WAITLIST,
          remainingCapacity: 0,
          slotId: null,
        },
        expected: {
          slotId: null,
          remainingCapacity: 0,
        },
      },
      {
        name: "not change an already retracted sign up",
        arrange: {
          participationStatus: ParticipationStatus.RETRACTED,
          remainingCapacity: 0,
          slotId: null,
        },
        expected: {
          slotId: null,
          remainingCapacity: 0,
          version: 0,
          participationStatus: ParticipationStatus.RETRACTED,
        },
      },
      {
        name: "not change an already removed sign up",
        arrange: {
          participationStatus: ParticipationStatus.REMOVED,
          remainingCapacity: 0,
          slotId: null,
        },
        expected: {
          slotId: null,
          remainingCapacity: 0,
          version: 0,
        },
      },
    ];

    test.each(testCases)("should $name", async ({ arrange, expected }) => {
      /**
       * Arrange
       *
       * 1. Create an event with capacity from the arrange object
       * 2. Create a slot with capacity from the arrange object
       * 3. Create a user
       * 4. Sign up the user to the event and slot, if arrange.slotId is null, sign up to the event without a slot
       */
      const event = await prisma.event.create({
        data: {
          name: faker.word.adjective(),
          startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
          endAt: DateTime.now().plus({ days: 2 }).toJSDate(),
          remainingCapacity: arrange.remainingCapacity,
        },
      });
      const slot = await prisma.eventSlot.create({
        data: {
          eventId: event.id,
          remainingCapacity: arrange.remainingCapacity,
        },
      });
      const user = await prisma.user.create({
        data: {
          email: faker.internet.exampleEmail({
            firstName: faker.string.uuid(),
          }),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          username: faker.string.sample(20),
          feideId: faker.string.uuid(),
        },
      });

      const signUp = await prisma.eventSignUp.create({
        data: {
          eventId: event.id,
          userId: user.id,
          slotId: arrange.slotId === null ? null : slot.id,
          participationStatus: arrange.participationStatus,
        },
      });

      /**
       * Act
       *
       * Retract the sign up
       */
      const actual = await eventService.removeSignUp(user.id, event.id);

      /**
       * Assert
       *
       * 1. Status should be retracted
       * 2. slotId should match the expected slotId
       * 3. version should be incremented
       * 4. remainingCapacity for evnet and slot should match the expected remainingCapacity
       */
      expect(actual.participationStatus).toBe(
        expected.participationStatus ?? ParticipationStatus.REMOVED,
      );
      expect(actual.slotId).toBe(expected.slotId);
      expect(actual.version).toBe(expected.version ?? signUp.version + 1);

      const updatedSlot = await prisma.eventSlot.findUnique({
        where: { id: slot.id },
      });
      const updatedEvent = await prisma.event.findUnique({
        where: { id: event.id },
      });

      expect(updatedSlot?.remainingCapacity).toBe(expected.remainingCapacity);
      expect(updatedEvent?.remainingCapacity).toBe(expected.remainingCapacity);
    });
  });
});

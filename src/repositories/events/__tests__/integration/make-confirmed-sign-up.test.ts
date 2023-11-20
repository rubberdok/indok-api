import { faker } from "@faker-js/faker";
import { ParticipationStatus } from "@prisma/client";
import { DateTime } from "luxon";

import { ErrorCode, errorCodes } from "@/domain/errors.js";
import prisma from "@/lib/prisma.js";

import { EventRepository } from "../../repository.js";

describe("EventRepository", () => {
  let eventRepository: EventRepository;

  beforeAll(() => {
    eventRepository = new EventRepository(prisma);
  });

  describe("makeConfirmedSignUp", () => {
    it("should update the status to confirmed, increment version, and decrement remainingCapacity for event and slot", async () => {
      /**
       * Arrange
       *
       * 1. Create a user
       * 2. Create an event
       * 3. Create a slot
       * 4. Create a sign up for the event with status ON_WAITLIST
       */
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          feideId: faker.string.uuid(),
          username: faker.internet.userName(),
        },
      });
      const event = await prisma.event.create({
        data: {
          name: faker.word.adjective(),
          startAt: new Date(),
          endAt: new Date(),
          remainingCapacity: 1,
        },
      });
      const slot = await prisma.eventSlot.create({
        data: {
          eventId: event.id,
          remainingCapacity: 1,
        },
      });
      const signUp = await prisma.eventSignUp.create({
        data: {
          eventId: event.id,
          slotId: slot.id,
          participationStatus: ParticipationStatus.ON_WAITLIST,
          userId: user.id,
        },
      });

      /**
       * Act
       *
       * 1. Call makeConfirmedSignUp
       */
      const actual = await eventRepository.makeConfirmedSignUp({ signUp, slotId: slot.id, eventId: event.id });

      /**
       * Assert
       *
       * 1. The participation status should be CONFIRMED
       * 2. The EventSignUp version should be incremented
       * 3. The Event remainingCapacity should be decremented
       * 4. The EventSlot remainingCapacity should be decremented
       */
      expect(actual.signUp.participationStatus).toBe(ParticipationStatus.CONFIRMED);
      expect(actual.signUp.version).toBe(signUp.version + 1);
      expect(actual.event.remainingCapacity).toBe(0);
      expect(actual.slot.remainingCapacity).toBe(0);
    });

    describe("should raise", () => {
      interface TestCase {
        name: string;
        arrange: {
          eventCapacity: number;
          slotCapacity: number;
        };
        act: {
          signUpVersion: number;
        };
        assertion: {
          errorCode: ErrorCode;
        };
      }
      const testCases: TestCase[] = [
        {
          name: "if the sign up version doesn't match",
          arrange: {
            eventCapacity: 1,
            slotCapacity: 1,
          },
          act: {
            signUpVersion: 1,
          },
          assertion: {
            errorCode: errorCodes.ERR_NOT_FOUND,
          },
        },
        {
          name: "if the event has no remaining capacity",
          arrange: {
            eventCapacity: 0,
            slotCapacity: 1,
          },
          act: {
            signUpVersion: 0,
          },
          assertion: {
            errorCode: errorCodes.ERR_NOT_FOUND,
          },
        },
        {
          name: "if the slot has no remaining capacity",
          arrange: {
            eventCapacity: 1,
            slotCapacity: 0,
          },
          act: {
            signUpVersion: 0,
          },
          assertion: {
            errorCode: errorCodes.ERR_NOT_FOUND,
          },
        },
      ];

      test.each(testCases)("$assertion.errorCode $name", async ({ assertion, act, arrange }) => {
        /**
         * Arrange
         *
         * 1. Create a user
         * 2. Create an event with remainingCapacity from test case
         * 3. Create a slot with remainingCapacity from test case
         * 4. Create a sign up with status ON_WAITLIST, and version from test case
         */
        const user = await prisma.user.create({
          data: {
            email: faker.internet.email(),
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            feideId: faker.string.uuid(),
            username: faker.internet.userName(),
          },
        });
        const event = await prisma.event.create({
          data: {
            name: faker.word.adjective(),
            startAt: DateTime.now().toJSDate(),
            endAt: DateTime.now().plus({ hours: 1 }).toJSDate(),
            remainingCapacity: arrange.eventCapacity,
          },
        });
        const slot = await prisma.eventSlot.create({
          data: {
            eventId: event.id,
            remainingCapacity: arrange.slotCapacity,
          },
        });
        const signUp = await prisma.eventSignUp.create({
          data: {
            eventId: event.id,
            slotId: slot.id,
            participationStatus: ParticipationStatus.ON_WAITLIST,
            userId: user.id,
          },
        });

        /**
         * Act
         *
         * Call makeConfirmedSignUp where the sign up version is from test case
         */
        const actual = eventRepository.makeConfirmedSignUp({
          signUp: { id: signUp.id, version: act.signUpVersion },
          slotId: slot.id,
          eventId: event.id,
        });

        /**
         * Assert
         *
         * The expected error is raised
         */
        await expect(actual).rejects.toHaveProperty("code", assertion.errorCode);
      });
    });
    it("should update the status to confirmed, increment version, and decrement remainingCapacity for event and slot", async () => {
      /**
       * Arrange
       *
       * 1. Create a user
       * 2. Create an event
       * 3. Create a slot
       * 4. Create a sign up for the event with status ON_WAITLIST
       */
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          feideId: faker.string.uuid(),
          username: faker.internet.userName(),
        },
      });
      const event = await prisma.event.create({
        data: {
          name: faker.word.adjective(),
          startAt: new Date(),
          endAt: new Date(),
          remainingCapacity: 1,
        },
      });
      const slot = await prisma.eventSlot.create({
        data: {
          eventId: event.id,
          remainingCapacity: 1,
        },
      });
      const signUp = await prisma.eventSignUp.create({
        data: {
          eventId: event.id,
          slotId: slot.id,
          participationStatus: ParticipationStatus.ON_WAITLIST,
          userId: user.id,
        },
      });

      /**
       * Act
       *
       * 1. Call makeConfirmedSignUp
       */
      const actual = await eventRepository.makeConfirmedSignUp({ signUp, slotId: slot.id, eventId: event.id });

      /**
       * Assert
       *
       * 1. The participation status should be CONFIRMED
       * 2. The EventSignUp version should be incremented
       * 3. The Event remainingCapacity should be decremented
       * 4. The EventSlot remainingCapacity should be decremented
       */
      expect(actual.signUp.participationStatus).toBe(ParticipationStatus.CONFIRMED);
      expect(actual.signUp.version).toBe(signUp.version + 1);
      expect(actual.event.remainingCapacity).toBe(0);
      expect(actual.slot.remainingCapacity).toBe(0);
    });
  });
});

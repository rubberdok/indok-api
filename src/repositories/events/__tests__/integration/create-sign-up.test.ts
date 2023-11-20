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

  describe("createSignUp", () => {
    describe("should create sign up", () => {
      interface TestCase {
        name: string;
        arrange: {
          eventCapacity: number;
          slotCapacity: number;
        };
        act: {
          participationsStatus: ParticipationStatus;
          event: {
            decrement?: boolean;
            capacityGt?: number;
          };
          slot?: {
            decrement?: boolean;
            capacityGt?: number;
          };
        };
        assertion: {
          expected: {
            slotId: string | null;
            slotCapacity?: number;
            eventCapacity: number;
          };
        };
      }

      const testCases: TestCase[] = [
        {
          name: "if the event has remaining capacity",
          arrange: {
            eventCapacity: 1,
            slotCapacity: 1,
          },
          act: {
            participationsStatus: ParticipationStatus.CONFIRMED,
            event: {
              decrement: true,
              capacityGt: 0,
            },
            slot: {
              decrement: true,
              capacityGt: 0,
            },
          },
          assertion: {
            expected: {
              eventCapacity: 0,
              slotCapacity: 0,
              slotId: expect.any(String),
            },
          },
        },
        {
          name: "and not decrement if the flag is not set",
          arrange: {
            eventCapacity: 1,
            slotCapacity: 1,
          },
          act: {
            participationsStatus: ParticipationStatus.CONFIRMED,
            event: {
              capacityGt: 0,
            },
            slot: {
              capacityGt: 0,
            },
          },
          assertion: {
            expected: {
              eventCapacity: 1,
              slotCapacity: 1,
              slotId: expect.any(String),
            },
          },
        },
        {
          name: "and not update slot if the slot is not set",
          arrange: {
            eventCapacity: 1,
            slotCapacity: 1,
          },
          act: {
            participationsStatus: ParticipationStatus.CONFIRMED,
            event: {
              capacityGt: 0,
            },
          },
          assertion: {
            expected: {
              eventCapacity: 1,
              slotCapacity: undefined,
              slotId: null,
            },
          },
        },
      ];

      test.each(testCases)("$name, event: $act.event, slot: $act.slot", async ({ arrange, act, assertion }) => {
        /**
         * Arrange
         *
         * 1. Create an event with capacity from test case
         * 2. Create a slot with capacity from test case
         * 3. Create a user
         */
        const event = await prisma.event.create({
          data: {
            startAt: DateTime.now().toJSDate(),
            name: faker.word.adjective(),
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
        const user = await prisma.user.create({
          data: {
            email: faker.internet.email(),
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            feideId: faker.string.uuid(),
            username: faker.string.sample(20),
          },
        });

        /**
         * Act
         *
         * Call createSignUp with args from test case
         */
        const actual = await eventRepository.createSignUp({
          userId: user.id,
          participationStatus: act.participationsStatus,
          event: {
            id: event.id,
            capacityGt: act.event.capacityGt,
            decrement: act.event.decrement,
          },
          ...(act.slot && {
            slot: {
              id: slot.id,
              capacityGt: act.slot.capacityGt,
              decrement: act.slot.decrement,
            },
          }),
        });

        /**
         * Assert
         *
         * The sign up should be created with the expected values,
         * the event and slot should be decremented if the decrement flag is set.
         * Versions should be incremented
         */
        expect(actual.signUp.eventId).toEqual(event.id);
        expect(actual.signUp.participationStatus).toEqual(act.participationsStatus);
        expect(actual.signUp.slotId).toEqual(assertion.expected.slotId);
        expect(actual.event.version).toEqual(event.version + 1);
        expect(actual.event.remainingCapacity).toEqual(assertion.expected.eventCapacity);
        expect(actual.slot?.remainingCapacity).toEqual(assertion.expected.slotCapacity);
      });
    });

    describe("should raise", () => {
      interface TestCase {
        name: string;
        arrange: {
          eventCapacity: number;
          slotCapacity: number;
        };
        act: {
          slot?: {
            capacityGt?: number;
          };
          event: {
            capacityGt?: number;
          };
        };
        assertion: {
          errorCode: ErrorCode;
        };
      }
      const testCases: TestCase[] = [
        {
          name: "if the event capacity is less than required",
          arrange: {
            eventCapacity: 0,
            slotCapacity: 1,
          },
          act: {
            event: { capacityGt: 0 },
            slot: { capacityGt: 0 },
          },
          assertion: {
            errorCode: errorCodes.ERR_NOT_FOUND,
          },
        },
        {
          name: "if the slot capacity is less than required",
          arrange: {
            eventCapacity: 1,
            slotCapacity: 0,
          },
          act: {
            event: { capacityGt: 0 },
            slot: { capacityGt: 0 },
          },
          assertion: {
            errorCode: errorCodes.ERR_NOT_FOUND,
          },
        },
        {
          name: "if slot is not provided and event capacity is less than required",
          arrange: {
            eventCapacity: 0,
            slotCapacity: 1,
          },
          act: {
            event: { capacityGt: 0 },
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
         */
        const user = await prisma.user.create({
          data: {
            email: faker.internet.email(),
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            feideId: faker.string.uuid(),
            username: faker.string.sample(20),
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

        /**
         * Act
         *
         * Call makeConfirmedSignUp where the sign up version is from test case
         */
        const actual = eventRepository.createSignUp({
          userId: user.id,
          participationStatus: ParticipationStatus.CONFIRMED,
          ...(act.slot && {
            slot: {
              id: slot.id,
              capacityGt: act.slot.capacityGt,
              decrement: true,
            },
          }),
          event: {
            id: event.id,
            capacityGt: act.event.capacityGt,
            decrement: true,
          },
        });

        /**
         * Assert
         *
         * The expected error is raised
         */
        await expect(actual).rejects.toHaveProperty("code", assertion.errorCode);
      });
    });
  });
});

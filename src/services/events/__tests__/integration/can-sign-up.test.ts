import { faker } from "@faker-js/faker";
import { ParticipationStatus } from "@prisma/client";
import { DateTime } from "luxon";

import { defaultTestDependenciesFactory } from "@/__tests__/dependencies-factory.js";
import prisma from "@/lib/prisma.js";

describe("EventService", () => {
  let eventService: ReturnType<typeof defaultTestDependenciesFactory>["apolloServerDependencies"]["eventService"];

  beforeAll(() => {
    ({
      apolloServerDependencies: { eventService },
    } = defaultTestDependenciesFactory());
  });

  describe("canSignUpForEvent", () => {
    interface TestCase {
      name: string;
      arrange: {
        event: {
          capacity: number | null;
        };
        slots: { capacity: number };
        user?: { participationStatus: ParticipationStatus; active: boolean };
      };
      expected: boolean;
    }

    const testCases: TestCase[] = [
      {
        name: "if the user does not have a sign up for the event, and there is capacity on the event and a slot",
        arrange: {
          event: {
            capacity: 1,
          },
          slots: {
            capacity: 1,
          },
        },
        expected: true,
      },
      {
        name: "if the user has an inactive sign up for the event, and there is capacity on the event and a slot",
        arrange: {
          event: {
            capacity: 1,
          },
          slots: {
            capacity: 1,
          },
          user: {
            participationStatus: ParticipationStatus.ON_WAITLIST,
            active: false,
          },
        },
        expected: true,
      },
      {
        name: "if the user has an active sign up for the event, even if there is capacity on the event and slot",
        arrange: {
          event: {
            capacity: 1,
          },
          slots: {
            capacity: 1,
          },
          user: {
            participationStatus: ParticipationStatus.CONFIRMED,
            active: true,
          },
        },
        expected: false,
      },
      {
        name: "if there is no capacity on the event, even if there is capacity in a slot",
        arrange: {
          event: {
            capacity: 0,
          },
          slots: {
            capacity: 1,
          },
        },
        expected: false,
      },
      {
        name: "if there is the event has remainingCapacity: null, even if there is capacity in a slot",
        arrange: {
          event: {
            capacity: null,
          },
          slots: {
            capacity: 1,
          },
        },
        expected: false,
      },
      {
        name: "if there is no slot with capacity on the event, even if there is capacity on the event",
        arrange: {
          event: {
            capacity: 1,
          },
          slots: {
            capacity: 0,
          },
        },
        expected: false,
      },
    ];

    test.each(testCases)("should return $expected $name", async ({ arrange, expected }) => {
      /**
       * Arrange
       *
       * Create a user to create the event
       * Create an event with the capacity specified in the test case
       * Create a slot with the capacity specified in the test case
       * Create a sign up for the user and the event with the participation status specified in the test case
       * if the participation status is CONFIRMED, create a sign up for the user and the slot
       */
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          feideId: faker.string.uuid(),
          username: faker.string.sample(20),
          isSuperUser: false,
        },
      });
      const event = await prisma.event.create({
        data: {
          name: faker.word.adjective(),
          startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
          endAt: DateTime.now().plus({ days: 2 }).toJSDate(),
          remainingCapacity: arrange.event.capacity,
        },
      });
      await prisma.eventSlot.create({
        data: {
          remainingCapacity: arrange.slots.capacity,
          event: { connect: { id: event.id } },
        },
      });
      if (arrange.user) {
        await prisma.eventSignUp.create({
          data: {
            event: { connect: { id: event.id } },
            user: { connect: { id: user.id } },
            participationStatus: arrange.user.participationStatus,
            active: arrange.user.active,
          },
        });
      }

      /**
       * Act
       *
       * Call the canSignUpForEvent function with the user and the event
       */
      const actual = await eventService.canSignUpForEvent(user.id, event.id);

      /**
       * Assert
       *
       * Assert that the result is the expected result
       */
      expect(actual).toBe(expected);
    });
  });
});

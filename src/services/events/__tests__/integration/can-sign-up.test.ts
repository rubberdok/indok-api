import { faker } from "@faker-js/faker";
import { Organization, ParticipationStatus, User } from "@prisma/client";
import { DateTime } from "luxon";

import prisma from "@/lib/prisma.js";

import { EventService } from "../../service.js";

import { makeDependencies } from "./dependencies-factory.js";

describe("EventService", () => {
  let eventService: EventService;

  beforeAll(() => {
    ({ eventService } = makeDependencies());
  });

  describe("canSignUpForEvent", () => {
    interface TestCase {
      name: string;
      arrange: {
        signUpDetails?: {
          capacity: number;
          signUpsEnabled: boolean;
          signUpsStartAt: Date;
          signUpsEndAt: Date;
          slots: {
            capacity: number;
          }[];
        };
        user?: { participationStatus: ParticipationStatus; active: boolean };
      };
      expected: boolean;
    }

    const testCases: TestCase[] = [
      {
        name: "if the user does not have a sign up for the event, and there is capacity on the event and a slot",
        arrange: {
          signUpDetails: {
            signUpsEnabled: true,
            signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
            signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
            capacity: 1,
            slots: [
              {
                capacity: 1,
              },
            ],
          },
        },
        expected: true,
      },
      {
        name: "if the user has an inactive sign up for the event, and there is capacity on the event and a slot",
        arrange: {
          signUpDetails: {
            signUpsEnabled: true,
            signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
            signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
            capacity: 1,
            slots: [
              {
                capacity: 1,
              },
            ],
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
          signUpDetails: {
            signUpsEnabled: true,
            signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
            signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
            capacity: 1,
            slots: [
              {
                capacity: 1,
              },
            ],
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
          signUpDetails: {
            signUpsEnabled: true,
            signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
            signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
            capacity: 0,
            slots: [
              {
                capacity: 1,
              },
            ],
          },
        },
        expected: false,
      },
      {
        name: "if signUpsEnabled: false, even if there is capacity",
        arrange: {
          signUpDetails: {
            signUpsEnabled: false,
            signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
            signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
            capacity: 1,
            slots: [
              {
                capacity: 1,
              },
            ],
          },
        },
        expected: false,
      },
      {
        name: "if there is no slot with capacity on the event, even if there is capacity on the event",
        arrange: {
          signUpDetails: {
            signUpsEnabled: true,
            signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
            signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
            capacity: 1,
            slots: [
              {
                capacity: 0,
              },
            ],
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
      const { user, organization } = await makeUserWithOrganizationMembership();
      const event = await eventService.create(
        user.id,
        organization.id,
        {
          name: faker.word.adjective(),
          startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
          endAt: DateTime.now().plus({ days: 2 }).toJSDate(),
        },
        arrange.signUpDetails
      );
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

async function makeUserWithOrganizationMembership(): Promise<{ user: User; organization: Organization }> {
  const user = await prisma.user.create({
    data: {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      username: faker.string.sample(30),
      feideId: faker.string.uuid(),
      email: faker.internet.exampleEmail({ firstName: faker.string.uuid() }),
    },
  });
  const organization = await prisma.organization.create({
    data: {
      name: faker.string.sample(20),
    },
  });
  await prisma.member.create({
    data: {
      organizationId: organization.id,
      userId: user.id,
      role: "MEMBER",
    },
  });
  return { user, organization };
}

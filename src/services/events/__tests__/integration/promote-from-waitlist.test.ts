import { faker } from "@faker-js/faker";
import { ParticipationStatus } from "@prisma/client";
import { merge } from "lodash-es";
import { DateTime } from "luxon";

import prisma from "@/lib/prisma.js";

import { EventService } from "../../service.js";

import { makeDependencies } from "./dependencies-factory.js";

describe("EventService", () => {
  let eventService: EventService;

  beforeAll(() => {
    ({ eventService } = makeDependencies());
  });

  describe("promoteFromWaitlist", () => {
    it("should promote the first sign up from the waitlist", async () => {
      /**
       * Arrange
       *
       * 1. Create an event with capacity
       * 2. Create a slot for the event with capacity
       * 3. Create 3 users
       * 4. Create 3 sign ups for the event, one for each user, with status ON_WAITLIST
       */
      const event = await prisma.event.create({
        data: {
          name: faker.word.adjective(),
          startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
          endAt: DateTime.now().plus({ days: 2 }).toJSDate(),
          remainingCapacity: 1,
        },
      });

      await prisma.eventSlot.create({
        data: {
          eventId: event.id,
          remainingCapacity: 1,
        },
      });

      const user1 = await makeUser();
      const user2 = await makeUser();
      const user3 = await makeUser();

      await makeSignUp({
        userId: user1.id,
        eventId: event.id,
        participationStatus: ParticipationStatus.CONFIRMED,
      });
      const signUp2 = await makeSignUp({
        userId: user2.id,
        eventId: event.id,
      });
      await makeSignUp({
        userId: user3.id,
        eventId: event.id,
      });

      /**
       * Act
       *
       * Call promoteFromWaitList for the event
       */
      const actual = await eventService.promoteFromWaitList(event.id);

      /**
       * Assert
       *
       * 1. The first sign up should be promoted from the waitlist
       */
      expect(actual).toEqual(
        merge(signUp2, { participationStatus: ParticipationStatus.CONFIRMED, version: 1, updatedAt: expect.any(Date) })
      );
    });
  });
});

function makeUser() {
  return prisma.user.create({
    data: {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      username: faker.string.sample(20),
      feideId: faker.string.uuid(),
    },
  });
}

function makeSignUp({
  userId,
  eventId,
  participationStatus = ParticipationStatus.ON_WAITLIST,
}: {
  userId: string;
  eventId: string;
  participationStatus?: ParticipationStatus;
}) {
  return prisma.eventSignUp.create({
    data: {
      userId,
      eventId,
      participationStatus,
    },
  });
}

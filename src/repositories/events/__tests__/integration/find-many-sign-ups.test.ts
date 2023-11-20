import { faker } from "@faker-js/faker";
import { ParticipationStatus } from "@prisma/client";
import { DateTime } from "luxon";

import prisma from "@/lib/prisma.js";

import { EventRepository } from "../../repository.js";

describe("EventRepository", () => {
  let eventRepository: EventRepository;

  beforeAll(() => {
    eventRepository = new EventRepository(prisma);
  });
  describe("findManySignUps", () => {
    it("should return sign ups ordered by created at ascending", async () => {
      /**
       * Arrange
       *
       * 1. Create 3 users
       * 2. Create an event
       * 3. Create 3 sign ups for the event
       */
      const user1 = await makeUser();
      const user2 = await makeUser();
      const user3 = await makeUser();

      const event = await prisma.event.create({
        data: {
          name: faker.word.adjective(),
          startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
          endAt: DateTime.now().plus({ days: 2 }).toJSDate(),
        },
      });

      const signUp1 = await makeWaitlistSignUp({ userId: user1.id, eventId: event.id });
      await makeWaitlistSignUp({
        userId: user2.id,
        eventId: event.id,
        status: ParticipationStatus.CONFIRMED,
      });
      const signUp3 = await makeWaitlistSignUp({ userId: user3.id, eventId: event.id });

      /**
       * Act
       *
       * Call findManySignUps
       */
      const actual = await eventRepository.findManySignUps({
        eventId: event.id,
        status: ParticipationStatus.ON_WAITLIST,
      });

      /**
       * Assert
       *
       * 1. The sign ups should be ordered by created at ascending
       * 2. Only the sign ups with status ON_WAITLIST should be returned, so the second sign up should not be returned
       */
      expect(actual).toHaveLength(2);
      expect(actual).toEqual([signUp1, signUp3]);
    });
  });
});

function makeWaitlistSignUp({
  userId,
  eventId,
  status,
}: {
  userId: string;
  eventId: string;
  status?: ParticipationStatus;
}) {
  return prisma.eventSignUp.create({
    data: {
      userId,
      eventId,
      participationStatus: status ?? ParticipationStatus.ON_WAITLIST,
    },
  });
}

function makeUser() {
  return prisma.user.create({
    data: {
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      username: faker.internet.userName(),
      feideId: faker.string.uuid(),
    },
  });
}

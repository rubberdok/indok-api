import { faker } from "@faker-js/faker";
import { ParticipationStatus } from "@prisma/client";
import { merge } from "lodash-es";
import { DateTime } from "luxon";
import prisma from "~/lib/prisma.js";
import { EventService } from "../../service.js";
import { makeDependencies, makeUserWithOrganizationMembership } from "./dependencies-factory.js";

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
      const { user, organization } = await makeUserWithOrganizationMembership();
      const event = await eventService.create(
        user.id,
        organization.id,
        {
          name: faker.word.adjective(),
          startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
          endAt: DateTime.now().plus({ days: 2 }).toJSDate(),
        },
        {
          signUpsEnabled: true,
          capacity: 1,
          signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
          signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
          slots: [
            {
              capacity: 1,
            },
          ],
        },
      );

      const slot = await prisma.eventSlot.findFirstOrThrow({
        where: {
          eventId: event.id,
        },
      });

      const user1 = await makeUser();
      const user2 = await makeUser();
      const user3 = await makeUser();

      await makeSignUp({
        userId: user1.id,
        eventId: event.id,
        participationStatus: ParticipationStatus.CONFIRMED,
        slotId: slot.id,
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
       * 2. The sign up should have status CONFIRMED
       * 3. The sign up should belong to the slot
       * 4. The sign up version should be incremented
       * 5. The slot remaining capacity should be decreased
       * 6. The event remaining capacity should be decreased
       */
      expect(actual).toEqual(
        merge(signUp2, {
          slotId: slot.id,
          participationStatus: ParticipationStatus.CONFIRMED,
          version: 1,
          updatedAt: expect.any(Date),
        }),
      );

      const updatedSlot = await prisma.eventSlot.findUnique({
        where: { id: slot.id },
      });
      expect(updatedSlot?.remainingCapacity).toBe(slot.remainingCapacity - 1);
      const updatedEvent = await prisma.event.findUnique({
        where: { id: event.id },
      });
      expect(updatedEvent?.remainingCapacity).toBe((event.signUpDetails?.remainingCapacity ?? NaN) - 1);
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
  slotId,
  participationStatus = ParticipationStatus.ON_WAITLIST,
}: {
  userId: string;
  eventId: string;
  slotId?: string;
  participationStatus?: ParticipationStatus;
}) {
  return prisma.eventSignUp.create({
    data: {
      userId,
      eventId,
      participationStatus,
      slotId,
    },
  });
}

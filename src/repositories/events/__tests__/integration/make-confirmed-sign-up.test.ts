import { faker } from "@faker-js/faker";

import prisma from "@/lib/prisma.js";

describe("Event Repository", () => {
  describe("makeConfirmedSignUp", () => {
    it("should update the status to confirmed, increment version, and decrement remainingCapacity for event and slot", async () => {
      /**
       * Arrange
       *
       * 1. Create an event
       * 2. Create a slot
       * 3. Create a sign up for the event with status ON_WAITLIST
       */
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
    });
  });
});

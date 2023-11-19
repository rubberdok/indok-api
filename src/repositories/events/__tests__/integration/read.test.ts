import { faker } from "@faker-js/faker";

import prisma from "@/lib/prisma.js";

import { EventRepository } from "../../repository.js";

describe("EventRepository", () => {
  let eventRepository: EventRepository;
  beforeAll(() => {
    eventRepository = new EventRepository(prisma);
  });

  describe("findMany", () => {
    it("should return a list of events", async () => {
      /**
       * Arrange
       *
       * 1. Create several events
       */
      const eventIds = [faker.string.uuid(), faker.string.uuid(), faker.string.uuid()];
      await Promise.all(
        eventIds.map((id) =>
          prisma.event.create({
            data: {
              id,
              name: faker.person.firstName(),
              startAt: faker.date.soon({ refDate: new Date(2021, 0, 1), days: 1 }),
              endAt: faker.date.soon({ refDate: new Date(2021, 0, 3), days: 1 }),
            },
          })
        )
      );

      /**
       * Act
       *
       * 1. Get the event
       */
      const events = await eventRepository.findMany();

      /**
       * Assert
       *
       * 1. The events should be returned
       */
      expect(events.length).toBeGreaterThanOrEqual(3);
      eventIds.map((id) => expect(events.map((event) => event.id)).toContainEqual(id));
    });

    it("should only return events after endAtGte", async () => {
      /**
       * Arrange
       *
       * 1. Create several events
       */
      const eventIds = [faker.string.uuid(), faker.string.uuid(), faker.string.uuid()];
      await Promise.all(
        eventIds.map((id) =>
          prisma.event.create({
            data: {
              id,
              name: faker.person.firstName(),
              startAt: faker.date.soon({ refDate: new Date(2021, 0, 1), days: 1 }),
              endAt: faker.date.soon({ refDate: new Date(2021, 0, 3), days: 1 }),
            },
          })
        )
      );

      const eventInThePast = await prisma.event.create({
        data: {
          id: faker.string.uuid(),
          name: faker.person.firstName(),
          startAt: new Date(2020, 0, 1),
          endAt: new Date(2020, 0, 3),
        },
      });

      /**
       * Act
       *
       * 1. Get the event
       */
      const events = await eventRepository.findMany({ endAtGte: new Date(2021, 0, 1) });

      /**
       * Assert
       *
       * 1. The event in the past should not have been returned
       */
      events.map((event) => expect(event.id).not.toEqual(eventInThePast.id));
    });
  });
});

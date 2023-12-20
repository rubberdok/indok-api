import { faker } from "@faker-js/faker";
import dayjs from "dayjs";
import { NotFoundError } from "~/domain/errors.js";
import prisma from "~/lib/prisma.js";
import { EventService } from "../../service.js";
import { makeDependencies } from "./dependencies-factory.js";

let eventService: EventService;

describe("EventService", () => {
  beforeAll(() => {
    ({ eventService } = makeDependencies());
  });
  describe("get", () => {
    it("should return an event", async () => {
      /**
       * Arrange
       *
       * 1. Create an event
       */
      const eventId = faker.string.uuid();
      await prisma.event.create({
        data: {
          id: eventId,
          name: faker.person.firstName(),
          startAt: faker.date.soon({ refDate: new Date(2021, 0, 1), days: 1 }),
          endAt: faker.date.soon({ refDate: new Date(2021, 0, 3), days: 1 }),
        },
      });

      /**
       * Act
       *
       * 1. Get the event
       */
      const event = await eventService.get(eventId);

      /**
       * Assert
       *
       * 1. The event should be returned
       */
      expect(event.id).toEqual(eventId);
    });

    it("should raise NotFoundError if the event does not exist", async () => {
      /**
       * Arrange
       *
       * 1. Create an event
       */
      const notFoundEventId = faker.string.uuid();
      await prisma.event.create({
        data: {
          name: faker.person.firstName(),
          startAt: faker.date.soon({ refDate: new Date(2021, 0, 1), days: 1 }),
          endAt: faker.date.soon({ refDate: new Date(2021, 0, 3), days: 1 }),
        },
      });

      /**
       * Act
       *
       * 1. Get the event
       */
      const event = eventService.get(notFoundEventId);

      /**
       * Assert
       *
       * 1. Not found error should be raised
       */
      await expect(event).rejects.toThrow(NotFoundError);
    });
  });

  describe("findMany", () => {
    it("should return a list of all events", async () => {
      /**
       * Arrange
       *
       * 1. Create several events
       */
      const eventIds = [
        faker.string.uuid(),
        faker.string.uuid(),
        faker.string.uuid(),
      ];
      await Promise.all(
        eventIds.map((id) =>
          prisma.event.create({
            data: {
              id,
              name: faker.person.firstName(),
              startAt: faker.date.soon({
                refDate: new Date(2021, 0, 1),
                days: 1,
              }),
              endAt: faker.date.soon({
                refDate: new Date(2021, 0, 3),
                days: 1,
              }),
            },
          }),
        ),
      );

      /**
       * Act
       *
       * 1. Get the event
       */
      const events = await eventService.findMany();

      /**
       * Assert
       *
       * 1. The events should be returned
       */
      expect(events.length).toBeGreaterThanOrEqual(3);
      for (const evnetId of eventIds) {
        expect(events.map((event) => event.id)).toContainEqual(evnetId);
      }
    });

    it("{ onlyFutureEvents: true } should only return events in the future", async () => {
      /**
       * Arrange
       *
       * 1. Create an event in the future
       * 2. Create an event in the past
       */
      const eventInTheFuture = await prisma.event.create({
        data: {
          id: faker.string.uuid(),
          name: faker.person.firstName(),
          startAt: dayjs().add(1, "day").toDate(),
          endAt: dayjs().add(2, "day").toDate(),
        },
      });
      const eventInThePast = await prisma.event.create({
        data: {
          id: faker.string.uuid(),
          name: faker.person.firstName(),
          startAt: dayjs().subtract(2, "day").toDate(),
          endAt: dayjs().subtract(1, "day").toDate(),
        },
      });

      /**
       * Act
       *
       * 1. Get all events with { onlyFutureEvents: true }
       */
      const events = await eventService.findMany({ onlyFutureEvents: true });

      /**
       * Assert
       *
       * 1. The event in the past should not be returned
       * 2. The event in the future should be returned
       */
      expect(events.map((event) => event.id)).not.toContain(eventInThePast.id);
      expect(events.map((event) => event.id)).toContain(eventInTheFuture.id);
    });
  });
});

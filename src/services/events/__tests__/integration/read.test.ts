import { faker } from "@faker-js/faker";

import { NotFoundError } from "@/domain/errors.js";
import prisma from "@/lib/prisma.js";
import { EventRepository } from "@/repositories/events/repository.js";
import { MemberRepository } from "@/repositories/organizations/members.js";
import { OrganizationRepository } from "@/repositories/organizations/organizations.js";
import { UserRepository } from "@/repositories/users/index.js";
import { OrganizationService } from "@/services/organizations/service.js";
import { UserService } from "@/services/users/service.js";

import { EventService } from "../../service.js";

let eventService: EventService;

describe("EventService", () => {
  beforeAll(() => {
    const eventRepository = new EventRepository(prisma);
    const organizationRepository = new OrganizationRepository(prisma);
    const memberRepository = new MemberRepository(prisma);
    const userRepository = new UserRepository(prisma);
    const userService = new UserService(userRepository);
    const organizationService = new OrganizationService(organizationRepository, memberRepository, userService);
    eventService = new EventService(eventRepository, organizationService);
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
      const notFoundEventId = "not-found-event-id";
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
      const events = await eventService.findMany();

      /**
       * Assert
       *
       * 1. The events should be returned
       */
      expect(events.length).toBeGreaterThanOrEqual(3);
      eventIds.map((id) => expect(events.map((event) => event.id)).toContainEqual(id));
    });
  });
});

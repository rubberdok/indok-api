import { faker } from "@faker-js/faker";

import prisma from "@/lib/prisma.js";

import { EventRepository } from "../../repository.js";

let eventsRepository: EventRepository;

describe("EventsRepository", () => {
  beforeAll(async () => {
    eventsRepository = new EventRepository(prisma);
  });

  describe("create", () => {
    it("should create a new event", async () => {
      /**
       * Arrange
       *
       * 1. Create an organization with organizationId {organizationId} to act as the organization that the event belongs to
       * 2. Create event data
       */
      const organization = await prisma.organization.create({
        data: {
          name: faker.company.name(),
        },
      });

      const startAt = faker.date.future();
      const data = {
        name: faker.company.name(),
        description: faker.lorem.paragraph(),
        startAt,
        endAt: faker.date.future({ refDate: startAt }),
        organizationId: organization.id,
        contactEmail: faker.internet.email(),
      };

      /**
       * Act
       */
      const result = eventsRepository.create(data);

      /**
       * Assert
       */
      await expect(result).resolves.toEqual({
        ...data,
        id: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        location: expect.any(String),
        remainingCapacity: null,
        capacity: null,
        slots: [],
        version: 0,
      });
    });

    it("should create an event with slots", async () => {
      /**
       * Arrange
       *
       * 1. Create an organization with organizationId {organizationId} to act as the organization that the event belongs to
       * 2. Create event data
       */
      const organization = await prisma.organization.create({
        data: {
          name: faker.company.name(),
        },
      });

      const startAt = faker.date.future();
      const data = {
        name: faker.company.name(),
        description: faker.lorem.paragraph(),
        startAt,
        endAt: faker.date.future({ refDate: startAt }),
        organizationId: organization.id,
        contactEmail: faker.internet.email(),
        capacity: 10,
        slots: [{ capacity: 5 }, { capacity: 5 }],
      };

      /**
       * Act
       */
      const result = await eventsRepository.create(data);

      /**
       * Assert
       *
       * Ensure that the event was created with additional slots
       */
      expect(result).toEqual({
        name: data.name,
        description: data.description,
        startAt: data.startAt,
        endAt: data.endAt,
        organizationId: data.organizationId,
        contactEmail: expect.any(String),
        id: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        location: expect.any(String),
        remainingCapacity: 10,
        capacity: 10,
        version: 0,
        slots: expect.any(Array),
      });
      const slots = await prisma.eventSlot.findMany({
        where: {
          eventId: result.id,
        },
      });
      expect(slots).toHaveLength(2);
      expect(slots.every((slot) => slot.remainingCapacity === 5)).toBe(true);
    });
  });

  describe("update", () => {
    interface TestCase {
      name: string;
      data: {
        name?: string;
        description?: string;
        startAt?: Date;
        endAt?: Date;
      };
    }

    const testCases: TestCase[] = [
      {
        name: "should update all defined fields",
        data: {
          name: faker.company.name(),
          description: faker.lorem.paragraph(),
          startAt: faker.date.future(),
          endAt: faker.date.future(),
        },
      },
      {
        name: "should not update undefined fields",
        data: {
          name: faker.company.name(),
        },
      },
    ];

    test.concurrent.each(testCases)("$name", async ({ data }) => {
      /**
       * Arrange
       *
       * 1. Create an organization with organizationId {organizationId} to act as the organization that the event belongs to
       * 2. Create an event with eventId {eventId} that belongs to the organization with organizationId {organizationId}
       */
      const organization = await prisma.organization.create({
        data: {
          name: faker.string.sample(20),
        },
      });

      const startAt = faker.date.future();
      const event = await prisma.event.create({
        data: {
          name: faker.company.name(),
          description: faker.lorem.paragraph(),
          startAt,
          endAt: faker.date.future({ refDate: startAt }),
          organizationId: organization.id,
          contactEmail: faker.internet.email(),
        },
      });

      /**
       * Act
       *
       * Update the event with the values from {data}
       */
      const result = eventsRepository.update(event.id, data);

      /**
       * Assert that only defined fields have been updated
       */
      await expect(result).resolves.toEqual({
        ...event,
        ...data,
        updatedAt: expect.any(Date),
        createdAt: expect.any(Date),
      });
    });
  });
});

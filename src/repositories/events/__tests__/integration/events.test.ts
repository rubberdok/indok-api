import { faker } from "@faker-js/faker";
import prisma from "~/lib/prisma.js";
import { EventRepository } from "../../repository.js";

let eventsRepository: EventRepository;

describe("EventsRepository", () => {
  beforeAll(async () => {
    eventsRepository = new EventRepository(prisma);
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
      await expect(result).resolves.toEqual(expect.objectContaining(data));
    });
  });
});

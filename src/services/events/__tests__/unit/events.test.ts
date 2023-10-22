import { BaseError, InvalidArgumentError } from "@/core/errors.js";
import { faker } from "@faker-js/faker";
import { mockDeep } from "jest-mock-extended";
import { EventRepository, EventService } from "../../service.js";

describe("EventsService", () => {
  describe("create", () => {
    describe("should raise", () => {
      interface TestCase {
        act: {
          userId: string;
          organizationId: string;
          data: {
            name: string;
            description?: string;
            startAt: Date;
            endAt?: Date;
            location?: string;
          };
        };
        expectedError: typeof BaseError;
      }

      const testCases: TestCase[] = [
        {
          act: {
            userId: faker.string.uuid(),
            organizationId: faker.string.uuid(),
            data: {
              name: "",
              startAt: faker.date.future(),
            },
          },
          expectedError: InvalidArgumentError,
        },
        {
          act: {
            userId: faker.string.uuid(),
            organizationId: faker.string.uuid(),
            data: {
              name: faker.commerce.productName(),
              startAt: faker.date.past(),
            },
          },
          expectedError: InvalidArgumentError,
        },
        {
          act: {
            userId: faker.string.uuid(),
            organizationId: faker.string.uuid(),
            data: {
              name: faker.commerce.productName(),
              startAt: faker.date.future(),
              endAt: faker.date.past(),
            },
          },
          expectedError: InvalidArgumentError,
        },
        {
          act: {
            userId: faker.string.uuid(),
            organizationId: faker.string.uuid(),
            data: {
              name: faker.commerce.productName(),
              startAt: faker.date.future(),
              endAt: faker.date.soon(),
            },
          },
          expectedError: InvalidArgumentError,
        },
        {
          act: {
            userId: faker.string.uuid(),
            organizationId: faker.string.uuid(),
            data: {
              name: faker.commerce.productName(),
              description: faker.string.sample(501),
              startAt: faker.date.future(),
            },
          },
          expectedError: InvalidArgumentError,
        },
        {
          act: {
            userId: faker.string.uuid(),
            organizationId: faker.string.uuid(),
            data: {
              name: faker.string.sample(101),
              startAt: faker.date.future(),
            },
          },
          expectedError: InvalidArgumentError,
        },
      ];

      test.concurrent.each(testCases)("$expectedError.name, $act.data", async ({ act, expectedError }) => {
        const eventsRepository = mockDeep<EventRepository>();
        const service = new EventService(eventsRepository);
        /**
         * Arrange
         * 1. Set up the mock repository to handle the create method
         */

        /**
         * Act
         */
        const result = service.create(act.userId, act.organizationId, act.data);

        /**
         * Assert that the expected error is thrown
         */
        await expect(result).rejects.toThrow(expectedError);
      });
    });

    it("should create an event", async () => {
      const eventsRepository = mockDeep<EventRepository>();
      const service = new EventService(eventsRepository);
      /**
       * Arrange
       * 1. Set up the mock repository to handle the create method
       */

      /**
       * Act
       */
      const userId = faker.string.uuid();
      const organizationId = faker.string.uuid();
      const data = {
        name: faker.commerce.productName(),
        description: faker.lorem.paragraph(),
        startAt: faker.date.soon(),
        endAt: faker.date.future(),
        location: faker.location.streetAddress(),
      };
      const result = service.create(userId, organizationId, data);

      /**
       * Assert that the expected error is thrown
       */
      await expect(result).resolves.not.toThrow();
      expect(eventsRepository.create).toHaveBeenCalledWith({
        ...data,
        organizerId: userId,
        organizationId,
      });
    });

    it("should default `endAt` to `startAt` + 2 hours", async () => {
      const eventsRepository = mockDeep<EventRepository>();
      const service = new EventService(eventsRepository);
      /**
       * Arrange
       * 1. Set up the mock repository to handle the create method
       */

      /**
       * Act
       */
      const userId = faker.string.uuid();
      const organizationId = faker.string.uuid();
      const startAt = faker.date.soon();
      const data = {
        name: faker.commerce.productName(),
        description: faker.lorem.paragraph(),
        startAt,
        location: faker.location.streetAddress(),
      };
      const result = service.create(userId, organizationId, data);

      /**
       * Assert that the expected error is thrown
       */
      await expect(result).resolves.not.toThrow();
      expect(eventsRepository.create).toHaveBeenCalledWith({
        ...data,
        endAt: new Date(startAt.getTime() + 2 * 60 * 60 * 1000),
        organizerId: userId,
        organizationId,
      });
    });
  });
});

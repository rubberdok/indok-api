import { faker } from "@faker-js/faker";
import { Event } from "@prisma/client";
import { mockDeep } from "jest-mock-extended";
import { DateTime } from "luxon";

import { BaseError, InvalidArgumentError, PermissionDeniedError } from "@/domain/errors.js";
import { Role } from "@/domain/organizations.js";

import { EventRepository, EventService, OrganizationService } from "../../service.js";

function setup() {
  const organizationService = mockDeep<OrganizationService>();
  const eventsRepository = mockDeep<EventRepository>();
  const service = new EventService(eventsRepository, organizationService);
  return { organizationService, eventsRepository, service };
}

function mockEvent(data: Partial<Event> = {}): Event {
  const startAt = faker.date.soon();
  const endAt = faker.date.future({ refDate: startAt });
  return {
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    startAt,
    endAt,
    organizationId: faker.string.uuid(),
    contactEmail: faker.internet.email(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    location: faker.location.streetAddress(),
    version: 0,
    spots: 0,
    ...data,
  };
}

describe("EventsService", () => {
  describe("create", () => {
    describe("should raise", () => {
      interface TestCase {
        act: {
          userId: string;
          organizationId: string;
          role?: Role | null;
          data: {
            name: string;
            description?: string;
            startAt: Date;
            endAt?: Date;
            location?: string;
            spots?: number;
            slots?: { spots: number }[];
          };
        };
        expectedError: typeof BaseError;
      }

      const testCases: TestCase[] = [
        {
          act: {
            userId: faker.string.uuid(),
            organizationId: faker.string.uuid(),
            role: Role.MEMBER,
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
            role: Role.MEMBER,
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
            role: Role.MEMBER,
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
            role: Role.MEMBER,
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
            role: Role.MEMBER,
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
            role: Role.MEMBER,
            data: {
              name: faker.string.sample(101),
              startAt: faker.date.future(),
            },
          },
          expectedError: InvalidArgumentError,
        },
        {
          act: {
            userId: faker.string.uuid(),
            organizationId: faker.string.uuid(),
            role: Role.MEMBER,
            data: {
              name: faker.string.sample(10),
              startAt: faker.date.future(),
              spots: -1,
            },
          },
          expectedError: InvalidArgumentError,
        },
        {
          act: {
            userId: faker.string.uuid(),
            organizationId: faker.string.uuid(),
            role: Role.MEMBER,
            data: {
              name: faker.string.sample(10),
              startAt: faker.date.future(),
              spots: 1,
              slots: [{ spots: -1 }, { spots: 1 }],
            },
          },
          expectedError: InvalidArgumentError,
        },
        {
          act: {
            userId: faker.string.uuid(),
            organizationId: faker.string.uuid(),
            role: null,
            data: {
              name: faker.string.sample(10),
              startAt: faker.date.future(),
            },
          },
          expectedError: PermissionDeniedError,
        },
      ];

      test.each(testCases)("$expectedError.name, $act.data", async ({ act, expectedError }) => {
        const { service, organizationService } = setup();
        /**
         * Arrange
         * 1. Set up the mock repository to handle the create method
         */
        organizationService.hasRole.mockResolvedValueOnce(act.role !== null && act.role !== undefined);

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
      const organizationService = mockDeep<OrganizationService>();
      const eventsRepository = mockDeep<EventRepository>();
      const service = new EventService(eventsRepository, organizationService);
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
        endAt: faker.date.soon({ refDate: startAt }),
        location: faker.location.streetAddress(),
        spots: 10,
        slots: [{ spots: 1 }, { spots: 2 }],
      };
      const result = service.create(userId, organizationId, data);

      /**
       * Assert that the event is created
       */
      await expect(result).resolves.not.toThrow();
      expect(eventsRepository.create).toHaveBeenCalledWith({
        ...data,
        organizationId,
      });
    });

    it("should default `endAt` to `startAt` + 2 hours", async () => {
      const { service, eventsRepository } = setup();

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
        organizationId,
      });
    });
  });

  describe("update", () => {
    describe("should raise", () => {
      interface TestCase {
        name: string;
        arrange: {
          hasRole: boolean;
          event: Event;
        };
        act: {
          data: {
            name?: string;
            description?: string;
            startAt?: Date;
            endAt?: Date;
            location?: string;
          };
        };
        assert: {
          error: typeof BaseError;
        };
      }
      const startAt = faker.date.soon();
      const endAt = faker.date.future({ refDate: startAt });

      const testCases: TestCase[] = [
        {
          name: "update name to empty string",
          arrange: {
            hasRole: true,
            event: mockEvent(),
          },
          act: {
            data: {
              name: "",
            },
          },
          assert: {
            error: InvalidArgumentError,
          },
        },
        {
          name: "Date.now() < endAt < startAt, changing endAt",
          arrange: {
            hasRole: true,
            event: mockEvent({ startAt, endAt }),
          },
          act: {
            data: {
              endAt: faker.date.recent({ refDate: startAt }),
            },
          },
          assert: {
            error: InvalidArgumentError,
          },
        },
        {
          name: "Date.now() < endAt < startAt, changing endAt and startAt",
          arrange: {
            hasRole: true,
            event: mockEvent({ startAt, endAt }),
          },
          act: {
            data: {
              endAt: faker.date.between({ from: startAt, to: endAt }),
              startAt: faker.date.soon({ refDate: endAt, days: 2 }),
            },
          },
          assert: {
            error: InvalidArgumentError,
          },
        },
        {
          name: "Date.now() < endAt < startAt, changing startAt",
          arrange: {
            hasRole: true,
            event: mockEvent({ startAt, endAt }),
          },
          act: {
            data: {
              startAt: faker.date.future({ refDate: endAt }),
            },
          },
          assert: {
            error: InvalidArgumentError,
          },
        },
        {
          name: "startAt < Date.now() < endAt",
          arrange: {
            hasRole: true,
            event: mockEvent({ startAt, endAt }),
          },
          act: {
            data: {
              startAt: faker.date.recent(),
            },
          },
          assert: {
            error: InvalidArgumentError,
          },
        },
        {
          name: "startAt < endAt < Date.now()",
          arrange: {
            hasRole: true,
            event: mockEvent({ startAt, endAt }),
          },
          act: {
            data: {
              endAt: faker.date.recent(),
            },
          },
          assert: {
            error: InvalidArgumentError,
          },
        },
        {
          name: "startAt < endAt < Date.now(), changing endAt",
          arrange: {
            hasRole: true,
            event: mockEvent({ startAt, endAt }),
          },
          act: {
            data: {
              endAt: faker.date.recent(),
            },
          },
          assert: {
            error: InvalidArgumentError,
          },
        },
        {
          name: "endAt < startAt < Date.now(), changing endAt and startAt",
          arrange: {
            hasRole: true,
            event: mockEvent({ startAt, endAt }),
          },
          act: {
            data: {
              startAt: faker.date.recent(),
              endAt: faker.date.past(),
            },
          },
          assert: {
            error: InvalidArgumentError,
          },
        },
      ];

      test.each(testCases)("$assert.error.name, $name, $act.data", async ({ assert, arrange, act }) => {
        const { service, eventsRepository, organizationService } = setup();

        /**
         * Arrange
         *
         * 1. Set up the mock for `eventsRepository.get` to return the event in {arrange.event}
         * 2. Set up the mock for `organizationService.hasRole` to return `true`
         */
        // 1.
        eventsRepository.get.mockResolvedValueOnce(arrange.event);
        // 2.
        organizationService.hasRole.mockResolvedValueOnce(arrange.hasRole);

        /**
         * Act
         */
        const result = service.update(faker.string.uuid(), faker.string.uuid(), act.data);

        /**
         * Assert
         */
        await expect(result).rejects.toThrow(assert.error);
        expect(eventsRepository.update).not.toHaveBeenCalled();
      });
    });
    describe("should update", () => {
      interface TestCase {
        name: string;
        arrange: {
          event: Event;
        };
        act: {
          data: {
            name?: string;
            description?: string;
            startAt?: Date;
            endAt?: Date;
            location?: string;
          };
        };
      }
      const startAt = faker.date.soon();
      const endAt = faker.date.future({ refDate: startAt });

      const testCases: TestCase[] = [
        {
          name: "update name",
          arrange: {
            event: mockEvent(),
          },
          act: {
            data: {
              name: faker.company.name(),
            },
          },
        },
        {
          name: "all defined fields are updated",
          arrange: {
            event: mockEvent({ startAt, endAt }),
          },
          act: {
            data: {
              name: faker.company.name(),
              description: faker.lorem.paragraph(),
              startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
              endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
              location: faker.location.streetAddress(),
            },
          },
        },
        {
          name: "undefined fields are not updated",
          arrange: {
            event: mockEvent({ startAt, endAt }),
          },
          act: {
            data: {
              name: faker.company.name(),
              startAt: undefined,
              endAt: faker.date.future({ refDate: endAt }),
              location: faker.location.streetAddress(),
            },
          },
        },
        {
          name: "update `startAt` to be in the future, before `endAt`",
          arrange: {
            event: mockEvent({ startAt, endAt }),
          },
          act: {
            data: {
              startAt: faker.date.recent({ refDate: endAt }),
            },
          },
        },
        {
          name: "update `endAt` to be in the future, after `startAt`",
          arrange: {
            event: mockEvent({ startAt, endAt }),
          },
          act: {
            data: {
              endAt: faker.date.soon({ refDate: startAt }),
            },
          },
        },
        {
          name: "update `startAt` and `endAt`, with `previousEndAt` < `startAt` < `endAt`",
          arrange: {
            event: mockEvent({ startAt, endAt }),
          },
          act: {
            data: {
              startAt: faker.date.soon({ refDate: endAt }),
              endAt: faker.date.future({ refDate: endAt }),
            },
          },
        },
      ];

      test.each(testCases)("$name, $act.data", async ({ arrange, act }) => {
        const { service, eventsRepository, organizationService } = setup();

        /**
         * Arrange
         *
         * 1. Set up the mock for `eventsRepository.get` to return the event in {arrange.event}
         * 2. Set up the mock for `organizationService.hasRole` to return `true`
         */
        // 1.
        eventsRepository.get.mockResolvedValueOnce(arrange.event);
        // 2.
        organizationService.hasRole.mockResolvedValueOnce(true);

        /**
         * Act
         */
        const result = service.update(faker.string.uuid(), faker.string.uuid(), act.data);

        /**
         * Assert
         */
        await expect(result).resolves.not.toThrow();
        expect(eventsRepository.update).toHaveBeenCalledWith(expect.any(String), act.data);
      });
    });
  });
});

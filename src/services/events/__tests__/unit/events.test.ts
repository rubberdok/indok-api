import { faker } from "@faker-js/faker";
import { EventSlot } from "@prisma/client";
import { mock, mockDeep } from "jest-mock-extended";
import { DateTime } from "luxon";
import { InvalidArgumentError, KnownDomainError, PermissionDeniedError } from "~/domain/errors.js";
import { Event } from "~/domain/events.js";
import { Role } from "~/domain/organizations.js";
import { EventRepository, EventService, PermissionService, UserService } from "../../service.js";

function setup() {
  const permissionService = mockDeep<PermissionService>();
  const eventsRepository = mockDeep<EventRepository>();
  const userService = mockDeep<UserService>();
  const service = new EventService(eventsRepository, permissionService, userService);
  return { permissionService, eventsRepository, service, userService };
}

function mockSignUpDetails(data: Partial<Event["signUpDetails"]> = {}): Event["signUpDetails"] {
  return {
    signUpsStartAt: DateTime.now().plus({ days: 1 }).toJSDate(),
    signUpsEndAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
    capacity: 10,
    remainingCapacity: 10,
    ...data,
  };
}

function mockEvent(data: Partial<Event & { slots: EventSlot[] }> = {}): Event & { slots: EventSlot[] } {
  const startAt = faker.date.soon();
  const endAt = faker.date.future({ refDate: startAt });
  return mock<Event & { slots: EventSlot[] }>({
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    startAt,
    endAt,
    organizationId: faker.string.uuid(),
    contactEmail: faker.internet.email(),
    location: faker.location.streetAddress(),
    ...data,
    signUpDetails: {
      remainingCapacity: 0,
      capacity: 0,
      signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
      signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
      ...data.signUpDetails,
    },
    signUpsEnabled: true,
  });
}

describe("EventsService", () => {
  describe("#create", () => {
    describe("should raise", () => {
      interface TestCase {
        name: string;
        act: {
          userId: string;
          organizationId: string;
          role?: Role | null;
          event: {
            name: string;
            description?: string;
            startAt: Date;
            endAt?: Date;
            location?: string;
          };
          signUpDetails?: {
            signUpsEnabled: boolean;
            signUpsStartAt: Date;
            signUpsEndAt: Date;
            capacity: number;
            slots: { capacity: number }[];
          };
        };
        expectedError: typeof KnownDomainError;
      }

      const testCases: TestCase[] = [
        {
          name: "if name is empty",
          act: {
            userId: faker.string.uuid(),
            organizationId: faker.string.uuid(),
            role: Role.MEMBER,
            event: {
              name: "",
              startAt: faker.date.future(),
            },
          },
          expectedError: InvalidArgumentError,
        },
        {
          name: "if startAt is in the past",
          act: {
            userId: faker.string.uuid(),
            organizationId: faker.string.uuid(),
            role: Role.MEMBER,
            event: {
              name: faker.commerce.productName(),
              startAt: faker.date.past(),
            },
          },
          expectedError: InvalidArgumentError,
        },
        {
          name: "if endAt is in the past and earlier than startAt",
          act: {
            userId: faker.string.uuid(),
            organizationId: faker.string.uuid(),
            role: Role.MEMBER,
            event: {
              name: faker.commerce.productName(),
              startAt: faker.date.future(),
              endAt: faker.date.past(),
            },
          },
          expectedError: InvalidArgumentError,
        },
        {
          name: "if endAt is in the future and earlier than startAt",
          act: {
            userId: faker.string.uuid(),
            organizationId: faker.string.uuid(),
            role: Role.MEMBER,
            event: {
              name: faker.commerce.productName(),
              startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
              endAt: DateTime.now().plus({ days: 1, hours: -2 }).toJSDate(),
            },
          },
          expectedError: InvalidArgumentError,
        },
        {
          name: "if the description is too long",
          act: {
            userId: faker.string.uuid(),
            organizationId: faker.string.uuid(),
            role: Role.MEMBER,
            event: {
              name: faker.commerce.productName(),
              description: faker.string.sample(10_001),
              startAt: faker.date.future(),
            },
          },
          expectedError: InvalidArgumentError,
        },
        {
          name: "if the name is too long",
          act: {
            userId: faker.string.uuid(),
            organizationId: faker.string.uuid(),
            role: Role.MEMBER,
            event: {
              name: faker.string.sample(101),
              startAt: faker.date.future(),
            },
          },
          expectedError: InvalidArgumentError,
        },
        {
          name: "if signUpDetails have negative capacity",
          act: {
            userId: faker.string.uuid(),
            organizationId: faker.string.uuid(),
            role: Role.MEMBER,
            event: {
              name: faker.string.sample(10),
              startAt: faker.date.future(),
            },
            signUpDetails: {
              signUpsEnabled: true,
              signUpsStartAt: DateTime.now().plus({ days: 1 }).toJSDate(),
              signUpsEndAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
              capacity: -1,
              slots: [{ capacity: 1 }],
            },
          },
          expectedError: InvalidArgumentError,
        },
        {
          name: "if signUpDetails have a slot with negative capacity",
          act: {
            userId: faker.string.uuid(),
            organizationId: faker.string.uuid(),
            role: Role.MEMBER,
            event: {
              name: faker.string.sample(10),
              startAt: faker.date.future(),
            },
            signUpDetails: {
              signUpsEnabled: true,
              signUpsStartAt: DateTime.now().plus({ days: 1 }).toJSDate(),
              signUpsEndAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
              capacity: 1,
              slots: [{ capacity: -1 }, { capacity: 1 }],
            },
          },
          expectedError: InvalidArgumentError,
        },
        {
          name: "if signUpsEndAt is earlier than signUpsStartAt",
          act: {
            userId: faker.string.uuid(),
            organizationId: faker.string.uuid(),
            role: Role.MEMBER,
            event: {
              name: faker.string.sample(10),
              startAt: faker.date.future(),
            },
            signUpDetails: {
              signUpsEnabled: true,
              signUpsStartAt: DateTime.now().plus({ days: 1 }).toJSDate(),
              signUpsEndAt: DateTime.now().plus({ days: 1, hours: -2 }).toJSDate(),
              capacity: 1,
              slots: [{ capacity: 1 }],
            },
          },
          expectedError: InvalidArgumentError,
        },
        {
          name: "if the user does not have a role in the organization",
          act: {
            userId: faker.string.uuid(),
            organizationId: faker.string.uuid(),
            role: null,
            event: {
              name: faker.string.sample(10),
              startAt: faker.date.future(),
            },
          },
          expectedError: PermissionDeniedError,
        },
      ];

      test.each(testCases)("$expectedError.name, $name", async ({ act, expectedError }) => {
        const { service, permissionService } = setup();
        /**
         * Arrange
         * 1. Set up the mock repository to handle the create method
         */
        permissionService.hasRole.mockResolvedValueOnce(act.role !== null && act.role !== undefined);

        /**
         * Act
         */
        const result = service.create(act.userId, act.organizationId, act.event, act.signUpDetails);

        /**
         * Assert that the expected error is thrown
         */
        await expect(result).rejects.toThrow(expectedError);
      });
    });

    it("should create an event without sign up details", async () => {
      const { service, eventsRepository, permissionService } = setup();
      /**
       * Arrange
       *
       * Mock permission service to return true
       */
      permissionService.hasRole.mockResolvedValueOnce(true);

      /**
       * Act
       */
      const userId = faker.string.uuid();
      const organizationId = faker.string.uuid();
      const startAt = faker.date.soon();
      const event = {
        name: faker.commerce.productName(),
        description: faker.lorem.paragraph(),
        startAt,
        endAt: faker.date.soon({ refDate: startAt }),
        location: faker.location.streetAddress(),
      };
      const result = service.create(userId, organizationId, event);

      /**
       * Assert that the event is created
       */
      await expect(result).resolves.not.toThrow();
      expect(eventsRepository.create).toHaveBeenCalledWith(expect.objectContaining({ organizationId }), undefined);
    });

    it("should create an event with sign up details", async () => {
      const { service, eventsRepository, permissionService } = setup();
      /**
       * Arrange
       *
       * Mock permission service to return true
       */
      permissionService.hasRole.mockResolvedValueOnce(true);

      /**
       * Act
       */
      const userId = faker.string.uuid();
      const organizationId = faker.string.uuid();
      const startAt = faker.date.soon();
      const event = {
        name: faker.commerce.productName(),
        description: faker.lorem.paragraph(),
        startAt,
        endAt: faker.date.soon({ refDate: startAt }),
        location: faker.location.streetAddress(),
      };
      const signUpDetails = {
        signUpsEnabled: true,
        signUpsStartAt: DateTime.now().plus({ days: 1 }).toJSDate(),
        signUpsEndAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
        capacity: 10,
        slots: [{ capacity: 10 }],
      };
      const result = service.create(userId, organizationId, event, signUpDetails);

      /**
       * Assert that the event is created
       */
      await expect(result).resolves.not.toThrow();
      expect(eventsRepository.create).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          signUpsStartAt: signUpDetails.signUpsStartAt,
          signUpsEndAt: signUpDetails.signUpsEndAt,
          capacity: signUpDetails.capacity,
          slots: signUpDetails.slots,
        }),
      );
    });

    it("should default `endAt` to `startAt` + 2 hours", async () => {
      const { service, eventsRepository, permissionService } = setup();

      /**
       * Arrange
       *
       * Mock permission service to return true
       */
      permissionService.hasRole.mockResolvedValueOnce(true);

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
      expect(eventsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          endAt: new Date(startAt.getTime() + 2 * 60 * 60 * 1000),
          organizationId,
        }),
        undefined,
      );
    });
  });

  describe("#update", () => {
    describe("should raise", () => {
      interface TestCase {
        name: string;
        arrange: {
          hasRole: boolean;
          event: Event & { slots: EventSlot[] };
        };
        act: {
          event: Partial<{
            name: string;
            description: string;
            startAt: Date;
            endAt: Date;
            location: string;
          }>;
          signUpDetails?: Partial<{
            signUpsEnabled: boolean;
            signUpsStartAt: Date;
            signUpsEndAt: Date;
            capacity: number;
            slots: { capacity: number }[];
          }>;
        };
        assert: {
          error: typeof KnownDomainError;
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
            event: {
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
            event: {
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
            event: {
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
            event: {
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
            event: {
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
            event: {
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
            event: {
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
            event: {
              startAt: faker.date.recent(),
              endAt: faker.date.past(),
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
            event: {
              startAt: faker.date.recent(),
              endAt: faker.date.past(),
            },
          },
          assert: {
            error: InvalidArgumentError,
          },
        },
        {
          name: "signUpsEndAt < signUpsStartAt, changing signUpsStartAt",
          arrange: {
            hasRole: true,
            event: mockEvent({
              signUpDetails: mockSignUpDetails({
                signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
              }),
            }),
          },
          act: {
            event: {},
            signUpDetails: {
              signUpsStartAt: DateTime.now().plus({ days: 2 }).toJSDate(),
            },
          },
          assert: {
            error: InvalidArgumentError,
          },
        },
        {
          name: "signUpsEndAt < signUpsStartAt, changing signUpsEndAt",
          arrange: {
            hasRole: true,
            event: mockEvent({
              signUpDetails: mockSignUpDetails({
                signUpsEndAt: DateTime.now().plus({ days: 3 }).toJSDate(),
                signUpsStartAt: DateTime.now().plus({ days: 2 }).toJSDate(),
              }),
            }),
          },
          act: {
            event: {},
            signUpDetails: {
              signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
            },
          },
          assert: {
            error: InvalidArgumentError,
          },
        },
        {
          name: "signUpsEndAt in the past, changing signUpsEndAt",
          arrange: {
            hasRole: true,
            event: mockEvent({
              signUpDetails: mockSignUpDetails({
                signUpsEndAt: DateTime.now().plus({ days: 3 }).toJSDate(),
                signUpsStartAt: DateTime.now().minus({ days: 2 }).toJSDate(),
              }),
            }),
          },
          act: {
            event: {},
            signUpDetails: {
              signUpsEndAt: DateTime.now().minus({ days: 1 }).toJSDate(),
            },
          },
          assert: {
            error: InvalidArgumentError,
          },
        },
      ];

      test.each(testCases)("$assert.error.name, $name", async ({ assert, arrange, act }) => {
        const { service, eventsRepository, permissionService } = setup();

        /**
         * Arrange
         *
         * 1. Set up the mock for `eventsRepository.get` to return the event in {arrange.event}
         * 2. Set up the mock for `permissionService.hasRole` to return `true`
         */
        // 1.
        eventsRepository.getWithSlots.mockResolvedValueOnce(arrange.event);
        // 2.
        permissionService.hasRole.mockResolvedValueOnce(arrange.hasRole);

        /**
         * Act
         */
        const result = service.update(faker.string.uuid(), faker.string.uuid(), act.event, act.signUpDetails);

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
          event: Event & { slots: EventSlot[] };
        };
        act: {
          event: Partial<{
            name?: string;
            description?: string;
            startAt?: Date;
            endAt?: Date;
            location?: string;
          }>;
          signUpDetails?: Partial<{
            signUpsEnabled: boolean;
            signUpsStartAt: Date;
            signUpsEndAt: Date;
            capacity: number;
            slots: { capacity: number }[];
          }>;
        };
        assert: {
          event: {
            name?: string;
            description?: string;
            startAt?: Date;
            endAt?: Date;
            location?: string;
          };
          signUpDetails?: Partial<{
            signUpsEnabled: boolean;
            signUpsStartAt: Date;
            signUpsEndAt: Date;
            capacity: number;
            slots: { capacity: number }[];
          }>;
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
            event: {
              name: faker.company.name(),
            },
          },
          assert: {
            event: {},
          },
        },
        {
          name: "all defined fields are updated",
          arrange: {
            event: mockEvent({ startAt, endAt }),
          },
          act: {
            event: {
              name: faker.company.name(),
              description: faker.lorem.paragraph(),
              startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
              endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
              location: faker.location.streetAddress(),
            },
          },
          assert: {
            event: {},
          },
        },
        {
          name: "undefined fields are not updated",
          arrange: {
            event: mockEvent({ startAt, endAt }),
          },
          act: {
            event: {
              name: faker.company.name(),
              startAt: undefined,
              endAt: faker.date.future({ refDate: endAt }),
              location: undefined,
            },
          },
          assert: {
            event: {
              location: expect.any(String),
              startAt: expect.any(Date),
              endAt: expect.any(Date),
              name: expect.any(String),
            },
          },
        },
        {
          name: "update `startAt` to be in the future, before `endAt`",
          arrange: {
            event: mockEvent({ startAt, endAt }),
          },
          act: {
            event: {
              startAt: faker.date.recent({ refDate: endAt }),
            },
          },
          assert: {
            event: {
              startAt: expect.any(Date),
              endAt: expect.any(Date),
            },
          },
        },
        {
          name: "update `endAt` to be in the future, after `startAt`",
          arrange: {
            event: mockEvent({ startAt, endAt }),
          },
          act: {
            event: {
              endAt: faker.date.soon({ refDate: startAt }),
            },
          },
          assert: {
            event: {
              startAt: expect.any(Date),
              endAt: expect.any(Date),
            },
          },
        },
        {
          name: "update `startAt` and `endAt`, with `previousEndAt` < `startAt` < `endAt`",
          arrange: {
            event: mockEvent({ startAt, endAt }),
          },
          act: {
            event: {
              startAt: faker.date.soon({ refDate: endAt }),
              endAt: faker.date.future({ refDate: endAt }),
            },
          },
          assert: {
            event: {},
          },
        },
        {
          name: "update signUpDetails when signUpsEndAt is in the past",
          arrange: {
            event: mockEvent({
              signUpsEnabled: true,
              signUpDetails: mockSignUpDetails({
                signUpsEndAt: DateTime.now().minus({ days: 2 }).toJSDate(),
                signUpsStartAt: DateTime.now().minus({ days: 3 }).toJSDate(),
              }),
            }),
          },
          act: {
            event: {},
            signUpDetails: {
              slots: [],
              signUpsEnabled: false,
            },
          },
          assert: {
            event: {},
            signUpDetails: {
              signUpsEnabled: false,
            },
          },
        },
      ];

      test.each(testCases)("$name", async ({ arrange, act, assert }) => {
        const { service, eventsRepository, permissionService } = setup();

        /**
         * Arrange
         *
         * 1. Set up the mock for `eventsRepository.get` to return the event in {arrange.event}
         * 2. Set up the mock for `permissionService.hasRole` to return `true`
         */
        // 1.
        eventsRepository.getWithSlots.mockResolvedValueOnce(arrange.event);
        // 2.
        permissionService.hasRole.mockResolvedValueOnce(true);

        /**
         * Act
         */
        const result = service.update(faker.string.uuid(), faker.string.uuid(), act.event, act.signUpDetails);

        /**
         * Assert
         */
        await expect(result).resolves.not.toThrow();
        expect(eventsRepository.update).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining(assert.event),
          assert.signUpDetails && expect.objectContaining(assert.signUpDetails),
        );
      });
    });
  });
});

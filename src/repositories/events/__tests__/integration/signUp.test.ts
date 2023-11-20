import { faker } from "@faker-js/faker";
import { Organization, ParticipationStatus } from "@prisma/client";

import { BaseError, NotFoundError } from "@/domain/errors.js";
import prisma from "@/lib/prisma.js";

import { EventRepository } from "../../repository.js";

let eventsRepository: EventRepository;

describe("EventsRepository", () => {
  beforeAll(() => {
    eventsRepository = new EventRepository(prisma);
  });

  describe("createConfirmedSignUp", () => {
    // All tests here need an event that belongs to an organization
    // they don't affect anything else, so we just share them across all tests.
    let organization: Organization;

    beforeAll(async () => {
      organization = await prisma.organization.create({
        data: {
          name: faker.company.name(),
        },
      });
    });

    describe("should create a new event sign up", () => {
      interface TestCase {
        name: string;
        arrange: {
          event: {
            remainingCapacity: number;
          };
          slot: {
            remainingCapacity: number;
          };
        };
        assert: {
          signUp: {
            participationStatus: ParticipationStatus;
          };
          eventSlot: {
            remainingCapacity: number;
            version: number;
          };
          event: {
            remainingCapacity: number;
            version: number;
          };
        };
      }

      const testCases: TestCase[] = [
        {
          name: "if there are remainingCapacity left on the event and the slot",
          arrange: {
            event: {
              remainingCapacity: 1,
            },
            slot: {
              remainingCapacity: 1,
            },
          },
          assert: {
            signUp: {
              participationStatus: ParticipationStatus.CONFIRMED,
            },
            eventSlot: {
              remainingCapacity: 0,
              version: 1,
            },
            event: {
              remainingCapacity: 0,
              version: 1,
            },
          },
        },
        {
          name: "should decrement the event and slot remainingCapacity by 1",
          arrange: {
            event: {
              remainingCapacity: 1,
            },
            slot: {
              remainingCapacity: 1,
            },
          },
          assert: {
            signUp: {
              participationStatus: ParticipationStatus.CONFIRMED,
            },
            eventSlot: {
              remainingCapacity: 0,
              version: 1,
            },
            event: {
              remainingCapacity: 0,
              version: 1,
            },
          },
        },
        {
          name: "should increment the event and slot versions by 1",
          arrange: {
            event: {
              remainingCapacity: 1,
            },
            slot: {
              remainingCapacity: 1,
            },
          },
          assert: {
            signUp: {
              participationStatus: ParticipationStatus.CONFIRMED,
            },
            eventSlot: {
              remainingCapacity: 0,
              version: 1,
            },
            event: {
              remainingCapacity: 0,
              version: 1,
            },
          },
        },
      ];

      test.each(testCases)("$name", async ({ arrange, assert }) => {
        /**
         * Arrange
         *
         * 1. Create a user with userId {userId} which is going to sign up for the event
         * 2. Create an event with eventId {eventId} that belongs to the organization with organizationId {organizationId}
         * 3. Create a a slot with slotId {slotId} that belongs to the event with eventId {eventId} and has {arrange.slot.remainingCapacity} total remainingCapacity
         */
        // 1.
        const user = await prisma.user.create({
          data: {
            email: faker.internet.email(),
            feideId: faker.string.uuid(),
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            username: faker.internet.userName(),
          },
        });

        // 2.
        const event = await prisma.event.create({
          data: {
            name: faker.company.name(),
            description: faker.lorem.paragraph(),
            startAt: faker.date.future(),
            endAt: faker.date.future(),
            location: faker.location.streetAddress(),
            remainingCapacity: arrange.event.remainingCapacity,
            organizationId: organization.id,
            contactEmail: faker.internet.email(),
          },
        });

        // 3.
        const slot = await prisma.eventSlot.create({
          data: {
            eventId: event.id,
            remainingCapacity: arrange.slot.remainingCapacity,
          },
        });

        /**
         * Act
         *
         * Sign the user up for the slot on the event
         */
        const result = eventsRepository.createConfirmedSignUp(user.id, event, slot);

        /**
         * Assert
         *
         * 1. The sign up should be created with the correct values
         * 2. The event slots version should be incremented by 1
         * 3. The event slots remaining capacity should be decremented by 1
         * 4. The event version should be incremented by 1
         * 5. The events' remaining capacity should be decremented by 1
         */
        await expect(result).resolves.toEqual({
          signUp: {
            id: expect.any(String),
            userId: user.id,
            participationStatus: assert.signUp.participationStatus,
            slotId: slot.id,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
            version: 0,
            eventId: event.id,
          },
          event: {
            ...event,
            remainingCapacity: assert.event.remainingCapacity,
            version: assert.event.version,
            updatedAt: expect.any(Date),
          },
          eventSlot: {
            ...slot,
            remainingCapacity: assert.eventSlot.remainingCapacity,
            version: assert.eventSlot.version,
            updatedAt: expect.any(Date),
          },
        });
      });
    });

    describe("should raise:", () => {
      interface TestCase {
        name: string;
        arrange: {
          event: {
            version: number;
            remainingCapacity: number;
          };
          slot: {
            version: number;
            remainingCapacity: number;
          };
        };
        act: {
          slot: {
            version: number;
          };
          event: {
            version: number;
          };
        };
        assert: {
          error: typeof BaseError;
        };
      }

      const testCases: TestCase[] = [
        {
          name: "if slot remainingCapacity are 0",
          arrange: {
            event: {
              version: 0,
              remainingCapacity: 1,
            },
            slot: {
              version: 0,
              remainingCapacity: 0,
            },
          },
          act: {
            slot: {
              version: 0,
            },
            event: {
              version: 0,
            },
          },
          assert: {
            error: NotFoundError,
          },
        },
        {
          name: "if event remainingCapacity are 0",
          arrange: {
            event: {
              version: 0,
              remainingCapacity: 0,
            },
            slot: {
              version: 0,
              remainingCapacity: 1,
            },
          },
          act: {
            slot: {
              version: 0,
            },
            event: {
              version: 0,
            },
          },
          assert: {
            error: NotFoundError,
          },
        },
      ];

      test.each(testCases)("$assert.error.name $name", async ({ arrange, assert, act }) => {
        /**
         * Arrange
         *
         * 1. Create a user with userId {userId} which is going to sign up for the event
         * 2. Create an event with eventId {eventId} that belongs to the organization with organizationId {organizationId}
         * 3. Create a a slot with slotId {slotId} that belongs to the event with eventId {eventId} and has {arrange.slot.remainingCapacity} total remainingCapacity
         */
        // 1.
        const user = await prisma.user.create({
          data: {
            email: faker.internet.email(),
            feideId: faker.string.uuid(),
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            username: faker.internet.userName(),
          },
        });

        // 2.
        const event = await prisma.event.create({
          data: {
            name: faker.company.name(),
            description: faker.lorem.paragraph(),
            startAt: faker.date.future(),
            endAt: faker.date.future(),
            location: faker.location.streetAddress(),
            remainingCapacity: arrange.event.remainingCapacity,
            organizationId: organization.id,
            version: arrange.event.version,
          },
        });

        // 3.
        const slot = await prisma.eventSlot.create({
          data: {
            eventId: event.id,
            remainingCapacity: arrange.slot.remainingCapacity,
            version: arrange.slot.version,
          },
        });

        /**
         * Act
         *
         * Sign the user up for the slot on the event
         */
        const result = eventsRepository.createConfirmedSignUp(
          user.id,
          { id: event.id, version: act.event.version },
          { id: slot.id, version: act.slot.version }
        );

        /**
         * Assert
         *
         * 1. The sign up should not be created
         * 2. The event slots version should not be incremented
         * 3. The event slots remainingCapacity should not be decremented
         * 4. The event version should not be incremented
         * 5. The event remainingCapacity should not be decremented
         * 6. The error should be {assert.error}
         */
        await expect(result).rejects.toThrow(assert.error);
        await expect(prisma.event.findUnique({ where: { id: event.id } })).resolves.toEqual(event);
        await expect(prisma.eventSlot.findUnique({ where: { id: slot.id } })).resolves.toEqual(slot);
        await expect(prisma.eventSignUp.findFirstOrThrow({ where: { userId: user.id } })).rejects.toThrow();
      });
    });
  });
  describe("createOnWaitlistSignUp", () => {
    // All tests here need an event that belongs to an organization
    // they don't affect anything else, so we just share them across all tests.
    let organization: Organization;

    beforeAll(async () => {
      organization = await prisma.organization.create({
        data: {
          name: faker.company.name(),
        },
      });
    });

    it("should create a new event sign up with status ON_WAITLIST", async () => {
      /**
       * Arrange
       *
       * 1. Create a user with userId {userId} which is going to sign up for the event
       * 2. Create an event with eventId {eventId} that belongs to the organization with
       * organizationId {organizationId} with 0 remainingCapacity
       * 3. Create a a slot with slotId {slotId} that belongs to the event with eventId {eventId} with 0 remainingCapacity
       */
      // 1.
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          feideId: faker.string.uuid(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          username: faker.internet.userName(),
        },
      });

      // 2.
      const event = await prisma.event.create({
        data: {
          name: faker.company.name(),
          description: faker.lorem.paragraph(),
          startAt: faker.date.future(),
          endAt: faker.date.future(),
          location: faker.location.streetAddress(),
          remainingCapacity: 0,
          organizationId: organization.id,
        },
      });

      // 3.
      const slot = await prisma.eventSlot.create({
        data: {
          eventId: event.id,
          remainingCapacity: 0,
        },
      });

      /**
       * Act
       *
       * Sign the user up for the slot on the event
       */
      const result = eventsRepository.createOnWaitlistSignUp(user.id, event);

      /**
       * Assert
       *
       * 1. The sign up should be created with the correct values
       * 2. The event slots version should not be incremented
       * 3. The event slots remainingCapacity should not be decremented
       * 4. The event version should not be incremented
       * 5. The event remainingCapacity should not be decremented
       */
      await expect(result).resolves.toEqual({
        id: expect.any(String),
        userId: user.id,
        participationStatus: ParticipationStatus.ON_WAITLIST,
        slotId: null,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        version: 0,
        eventId: event.id,
      });
      await expect(prisma.event.findUnique({ where: { id: event.id } })).resolves.toEqual(event);
      await expect(prisma.eventSlot.findFirst({ where: { id: slot.id } })).resolves.toEqual(slot);
    });
  });
});

import { faker } from "@faker-js/faker";
import { Organization, ParticipationStatus, User } from "@prisma/client";

import { BaseError, NotFoundError } from "@/domain/errors.js";
import prisma from "@/lib/prisma.js";

import { EventRepository } from "../../repository.js";

let eventsRepository: EventRepository;

describe("EventsRepository", () => {
  beforeAll(() => {
    eventsRepository = new EventRepository(prisma);
  });

  describe("createConfirmedSignUp", () => {
    // All tests here need an event that belongs to an organization and is organized by a user
    // they don't affect anything else, so we just share them across all tests.
    let organizer: User;
    let organization: Organization;

    beforeAll(async () => {
      organizer = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          feideId: faker.string.uuid(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          username: faker.internet.userName(),
        },
      });
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
            spots: number;
          };
          slot: {
            spots: number;
          };
        };
        assert: {
          signUp: {
            participationStatus: ParticipationStatus;
          };
          eventSlot: {
            spots: number;
            version: number;
          };
          event: {
            spots: number;
            version: number;
          };
        };
      }

      const testCases: TestCase[] = [
        {
          name: "if there are spots left on the event and the slot",
          arrange: {
            event: {
              spots: 1,
            },
            slot: {
              spots: 1,
            },
          },
          assert: {
            signUp: {
              participationStatus: ParticipationStatus.CONFIRMED,
            },
            eventSlot: {
              spots: 0,
              version: 1,
            },
            event: {
              spots: 0,
              version: 1,
            },
          },
        },
        {
          name: "should decrement the event and slot spots by 1",
          arrange: {
            event: {
              spots: 1,
            },
            slot: {
              spots: 1,
            },
          },
          assert: {
            signUp: {
              participationStatus: ParticipationStatus.CONFIRMED,
            },
            eventSlot: {
              spots: 0,
              version: 1,
            },
            event: {
              spots: 0,
              version: 1,
            },
          },
        },
        {
          name: "should increment the event and slot versions by 1",
          arrange: {
            event: {
              spots: 1,
            },
            slot: {
              spots: 1,
            },
          },
          assert: {
            signUp: {
              participationStatus: ParticipationStatus.CONFIRMED,
            },
            eventSlot: {
              spots: 0,
              version: 1,
            },
            event: {
              spots: 0,
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
         * 2. Create an event with eventId {eventId} that belongs to the organization with organizationId {organizationId} and is organized by the organizer
         * 3. Create a a slot with slotId {slotId} that belongs to the event with eventId {eventId} and has {arrange.slot.spots} total spots
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
            spots: arrange.event.spots,
            organizationId: organization.id,
            organizerId: organizer.id,
          },
        });

        // 3.
        const slot = await prisma.eventSlot.create({
          data: {
            eventId: event.id,
            spots: arrange.slot.spots,
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
         * 3. The event slots spots should be decremented by 1
         * 4. The event version should be incremented by 1
         * 5. The event spots should be decremented by 1
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
            spots: assert.event.spots,
            version: assert.event.version,
            updatedAt: expect.any(Date),
          },
          eventSlot: {
            ...slot,
            spots: assert.eventSlot.spots,
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
            spots: number;
          };
          slot: {
            version: number;
            spots: number;
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
          name: "if slot spots are 0",
          arrange: {
            event: {
              version: 0,
              spots: 1,
            },
            slot: {
              version: 0,
              spots: 0,
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
          name: "if event spots are 0",
          arrange: {
            event: {
              version: 0,
              spots: 0,
            },
            slot: {
              version: 0,
              spots: 1,
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
         * 2. Create an event with eventId {eventId} that belongs to the organization with organizationId {organizationId} and is organized by the organizer
         * 3. Create a a slot with slotId {slotId} that belongs to the event with eventId {eventId} and has {arrange.slot.spots} total spots
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
            spots: arrange.event.spots,
            organizationId: organization.id,
            organizerId: organizer.id,
            version: arrange.event.version,
          },
        });

        // 3.
        const slot = await prisma.eventSlot.create({
          data: {
            eventId: event.id,
            spots: arrange.slot.spots,
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
         * 3. The event slots spots should not be decremented
         * 4. The event version should not be incremented
         * 5. The event spots should not be decremented
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
    // All tests here need an event that belongs to an organization and is organized by a user
    // they don't affect anything else, so we just share them across all tests.
    let organizer: User;
    let organization: Organization;

    beforeAll(async () => {
      organizer = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          feideId: faker.string.uuid(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          username: faker.internet.userName(),
        },
      });
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
       * organizationId {organizationId} and is organized by the organizer with 0 spots
       * 3. Create a a slot with slotId {slotId} that belongs to the event with eventId {eventId} with 0 spots
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
          spots: 0,
          organizationId: organization.id,
          organizerId: organizer.id,
        },
      });

      // 3.
      const slot = await prisma.eventSlot.create({
        data: {
          eventId: event.id,
          spots: 0,
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
       * 3. The event slots spots should not be decremented
       * 4. The event version should not be incremented
       * 5. The event spots should not be decremented
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

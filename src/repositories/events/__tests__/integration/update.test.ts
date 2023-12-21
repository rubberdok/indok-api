import { fail } from "assert";
import { faker } from "@faker-js/faker";
import { ParticipationStatus } from "@prisma/client";
import { merge, range } from "lodash-es";
import { InvalidCapacityError } from "~/domain/events.js";
import prisma from "~/lib/prisma.js";
import { EventRepository } from "../../repository.js";

describe("EventRepository", () => {
  let eventRepository: EventRepository;

  beforeAll(() => {
    eventRepository = new EventRepository(prisma);
  });

  describe("#update", () => {
    describe("with existing sign ups, updating existing slots", () => {
      interface TestCase {
        name: string;
        arrange: {
          signUps: number;
          event: {
            capacity: number;
          };
          slots: {
            gradeYears?: number[];
            capacity: number;
          }[];
        };
        act: {
          signUpDetails: {
            signUpsEnabled: boolean;
            capacity: number;
            slots: {
              capacity: number;
              gradeYears?: number[];
            }[];
            signUpsStartAt: Date;
            signUpsEndAt: Date;
          };
        };
        assert: {
          slots: {
            capacity: number;
            remainingCapacity: number;
            gradeYears?: number[];
          }[];
          event: {
            capacity: number;
            remainingCapacity: number;
          };
        };
      }
      const testCases: TestCase[] = [
        {
          name: "should update the capacity and remaining capacity of the event and slots when the capacity is increased",
          arrange: {
            signUps: 10,
            event: {
              capacity: 10,
            },
            slots: [
              {
                capacity: 10,
              },
            ],
          },
          act: {
            signUpDetails: {
              signUpsEnabled: true,
              capacity: 20,
              slots: [
                {
                  capacity: 20,
                },
              ],
              signUpsStartAt: new Date(),
              signUpsEndAt: new Date(),
            },
          },
          assert: {
            slots: [
              {
                capacity: 20,
                remainingCapacity: 10,
                gradeYears: [1, 2, 3, 4, 5],
              },
            ],
            event: {
              capacity: 20,
              remainingCapacity: 10,
            },
          },
        },
        {
          name: "should update the capacity and remaining capacity of the event and slots when capacity is decreased, but there is enough remaining capacity for the existing sign ups",
          arrange: {
            signUps: 10,
            event: {
              capacity: 20,
            },
            slots: [
              {
                capacity: 20,
              },
            ],
          },
          act: {
            signUpDetails: {
              signUpsEnabled: true,
              capacity: 10,
              slots: [
                {
                  capacity: 10,
                },
              ],
              signUpsStartAt: new Date(),
              signUpsEndAt: new Date(),
            },
          },
          assert: {
            slots: [
              {
                capacity: 10,
                remainingCapacity: 0,
                gradeYears: [1, 2, 3, 4, 5],
              },
            ],
            event: {
              capacity: 10,
              remainingCapacity: 0,
            },
          },
        },
        {
          name: "should update the grade years of the slot",
          arrange: {
            signUps: 10,
            event: {
              capacity: 10,
            },
            slots: [
              {
                gradeYears: [1, 2],
                capacity: 10,
              },
            ],
          },
          act: {
            signUpDetails: {
              signUpsEnabled: true,
              capacity: 10,
              slots: [
                {
                  gradeYears: [3, 4],
                  capacity: 10,
                },
              ],
              signUpsStartAt: new Date(),
              signUpsEndAt: new Date(),
            },
          },
          assert: {
            slots: [
              {
                gradeYears: [3, 4],
                capacity: 10,
                remainingCapacity: 0,
              },
            ],
            event: {
              capacity: 10,
              remainingCapacity: 0,
            },
          },
        },
      ];

      test.each(testCases)("$name", async ({ arrange, act, assert }) => {
        /**
         * Arrange
         *
         * 1. Create an organization to host the event
         * 2. Create an event with slots and sign ups enabled
         */
        const organization = await prisma.organization.create({
          data: {
            name: faker.string.sample(20),
          },
        });
        const event = await eventRepository.create(
          {
            name: faker.word.adjective(),
            startAt: faker.date.past(),
            endAt: faker.date.future(),
            contactEmail: faker.internet.email(),
            organizationId: organization.id,
          },
          {
            signUpsEnabled: true,
            capacity: arrange.event.capacity,
            slots: arrange.slots,
            signUpsStartAt: new Date(),
            signUpsEndAt: new Date(),
          },
        );
        const slots = await prisma.eventSlot.findMany({
          where: {
            eventId: event.id,
          },
        });

        await Promise.all(
          range(arrange.signUps).map(async () => {
            const user = await prisma.user.create({
              data: {
                email: faker.internet.exampleEmail({
                  firstName: faker.string.uuid(),
                }),
                firstName: faker.person.firstName(),
                lastName: faker.person.lastName(),
                username: faker.string.sample(20),
                feideId: faker.string.uuid(),
              },
            });
            if (slots[0] !== undefined) {
              await eventRepository.createSignUp({
                userId: user.id,
                participationStatus: ParticipationStatus.CONFIRMED,
                // Since we created this slot with the event, we know that it exists for this test
                slotId: slots[0].id,
                eventId: slots[0].eventId,
              });
            }
          }),
        );

        /**
         * Act
         *
         * 1. Update the event with act.signUpDetails
         */
        const actual = await eventRepository.update(
          event.id,
          {},
          {
            ...act.signUpDetails,
            slots: slots.map((slot, index) => merge({}, slot, act.signUpDetails.slots[index])),
          },
        );
        const actualSlots = await prisma.eventSlot.findMany({
          where: {
            eventId: event.id,
          },
        });

        /**
         * Assert
         *
         * 1. The event capacity should be updated
         * 2. The event remaining capacity should be correctly updated
         * 3. The slot capacities and remaining capacities should be correctly updated
         * 4. Any new slots should be created
         */
        expect(actual.signUpDetails?.capacity).toBe(assert.event.capacity);
        expect(actual.signUpDetails?.remainingCapacity).toBe(assert.event.remainingCapacity);
        expect(
          actualSlots.map((slot) => ({
            capacity: slot.capacity,
            remainingCapacity: slot.remainingCapacity,
            gradeYears: slot.gradeYears,
          })),
        ).toEqual(assert.slots);
      });
    });

    it("should create new slots for the event when slots are updated without an ID", async () => {
      /**
       * Arrange
       *
       * 1. Create an organization to host the event
       * 2. Create an event with slots and sign ups enabled
       */
      const organization = await prisma.organization.create({
        data: {
          name: faker.string.sample(20),
        },
      });
      const event = await eventRepository.create(
        {
          name: faker.word.adjective(),
          startAt: faker.date.past(),
          endAt: faker.date.future(),
          contactEmail: faker.internet.email(),
          organizationId: organization.id,
        },
        {
          signUpsEnabled: true,
          capacity: 1,
          slots: [{ capacity: 1 }],
          signUpsStartAt: new Date(),
          signUpsEndAt: new Date(),
        },
      );
      const existingSlots = await prisma.eventSlot.findMany({
        where: {
          eventId: event.id,
        },
      });
      if (existingSlots.length !== 1) fail("Expected to find exactly one slot");

      /**
       * Act
       *
       * 1. Update the event with a new slot
       */
      const actual = await eventRepository.update(
        event.id,
        {},
        {
          slots: [{ id: existingSlots[0]?.id, capacity: 2 }, { capacity: 1 }],
          capacity: 1,
          signUpsEnabled: true,
          signUpsStartAt: new Date(),
          signUpsEndAt: new Date(),
        },
      );
      const actualSlots = await prisma.eventSlot.findMany({
        where: {
          eventId: event.id,
        },
      });

      /**
       * Assert
       *
       * 1. The event capacity should be updated
       * 2. The event remaining capacity should be correctly updated
       * 3. The slot capacities and remaining capacities should be correctly updated
       * 4. Any new slots should be created
       */
      expect(actual.signUpDetails?.capacity).toBe(1);
      expect(actual.signUpDetails?.remainingCapacity).toBe(1);
      expect(actualSlots).toHaveLength(2);
      expect(actualSlots[0]?.id).toEqual(existingSlots[0]?.id);
      expect(actualSlots[0]?.capacity).toBe(2);
    });

    it("should delete any slots that are on the event, but not included in the update method", async () => {
      /**
       * Arrange
       *
       * 1. Create an organization to host the event
       * 2. Create an event with slots and sign ups enabled
       */
      const organization = await prisma.organization.create({
        data: {
          name: faker.string.sample(20),
        },
      });
      const event = await eventRepository.create(
        {
          name: faker.word.adjective(),
          startAt: faker.date.past(),
          endAt: faker.date.future(),
          contactEmail: faker.internet.email(),
          organizationId: organization.id,
        },
        {
          signUpsEnabled: true,
          capacity: 1,
          slots: [{ capacity: 1 }],
          signUpsStartAt: new Date(),
          signUpsEndAt: new Date(),
        },
      );
      const existingSlots = await prisma.eventSlot.findMany({
        where: {
          eventId: event.id,
        },
      });
      if (existingSlots.length !== 1) fail("Expected to find exactly one slot");

      /**
       * Act
       *
       * 1. Update the event with a new slot
       */
      await eventRepository.update(
        event.id,
        {},
        {
          slots: [{ capacity: 10 }],
          capacity: 1,
          signUpsEnabled: true,
          signUpsStartAt: new Date(),
          signUpsEndAt: new Date(),
        },
      );
      const actualSlots = await prisma.eventSlot.findMany({
        where: {
          eventId: event.id,
        },
      });

      /**
       * Assert
       *
       * A new slot should be created, and the existing one should be deleted.
       */
      expect(actualSlots).toHaveLength(1);
      expect(actualSlots[0]?.id).not.toEqual(existingSlots[0]?.id);
      expect(actualSlots[0]?.capacity).toBe(10);
    });

    it("should raise an InvalidCapacityError if we attempt to delete a slot with sign ups", async () => {
      /**
       * Arrange
       *
       * 1. Create a user to sign up with
       * 2. Create an organization to host the event
       * 3. Create an event with slots and sign ups enabled
       */
      const user = await prisma.user.create({
        data: {
          email: faker.internet.exampleEmail({
            firstName: faker.string.uuid(),
          }),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          username: faker.string.sample(20),
          feideId: faker.string.uuid(),
        },
      });
      const organization = await prisma.organization.create({
        data: {
          name: faker.string.sample(20),
        },
      });
      const event = await eventRepository.create(
        {
          name: faker.word.adjective(),
          startAt: faker.date.past(),
          endAt: faker.date.future(),
          contactEmail: faker.internet.email(),
          organizationId: organization.id,
        },
        {
          signUpsEnabled: true,
          capacity: 1,
          slots: [{ capacity: 1 }],
          signUpsStartAt: new Date(),
          signUpsEndAt: new Date(),
        },
      );
      const existingSlot = await prisma.eventSlot.findFirstOrThrow({
        where: {
          eventId: event.id,
        },
      });
      await eventRepository.createSignUp({
        eventId: event.id,
        userId: user.id,
        participationStatus: ParticipationStatus.CONFIRMED,
        slotId: existingSlot.id,
      });

      /**
       * Act
       *
       * 1. Update the event with a new slot
       */
      const actual = eventRepository.update(
        event.id,
        {},
        {
          slots: [{ capacity: 10 }],
          capacity: 1,
          signUpsEnabled: true,
          signUpsStartAt: new Date(),
          signUpsEndAt: new Date(),
        },
      );

      /**
       * Assert
       *
       * The update call should raise an InvalidCapacityError
       */
      await expect(actual).rejects.toThrow(InvalidCapacityError);
    });

    it("should raise an InvalidCapacityError if we attempt to reduce the capacity of an event below the number of sign ups", async () => {
      /**
       * Arrange
       *
       * 1. Create a user to sign up with
       * 2. Create an organization to host the event
       * 3. Create an event with slots and sign ups enabled
       */
      const user = await prisma.user.create({
        data: {
          email: faker.internet.exampleEmail({
            firstName: faker.string.uuid(),
          }),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          username: faker.string.sample(20),
          feideId: faker.string.uuid(),
        },
      });
      const organization = await prisma.organization.create({
        data: {
          name: faker.string.sample(20),
        },
      });
      const event = await eventRepository.create(
        {
          name: faker.word.adjective(),
          startAt: faker.date.past(),
          endAt: faker.date.future(),
          contactEmail: faker.internet.email(),
          organizationId: organization.id,
        },
        {
          signUpsEnabled: true,
          capacity: 1,
          slots: [{ capacity: 1 }],
          signUpsStartAt: new Date(),
          signUpsEndAt: new Date(),
        },
      );
      const existingSlot = await prisma.eventSlot.findFirstOrThrow({
        where: {
          eventId: event.id,
        },
      });
      await eventRepository.createSignUp({
        eventId: event.id,
        userId: user.id,
        participationStatus: ParticipationStatus.CONFIRMED,
        slotId: existingSlot.id,
      });

      /**
       * Act
       *
       * 1. Update the event with a new slot
       */
      const actual = eventRepository.update(
        event.id,
        {},
        {
          slots: [{ id: existingSlot.id, capacity: 10 }],
          capacity: 0,
          signUpsEnabled: true,
          signUpsStartAt: new Date(),
          signUpsEndAt: new Date(),
        },
      );

      /**
       * Assert
       *
       * The update call should raise an InvalidCapacityError
       */
      await expect(actual).rejects.toThrow(InvalidCapacityError);
    });

    it("should raise an InvalidCapacityError if we attempt to reduce the capacity of a slot below the number of sign ups for that slot", async () => {
      /**
       * Arrange
       *
       * 1. Create a user to sign up with
       * 2. Create an organization to host the event
       * 3. Create an event with slots and sign ups enabled
       */
      const user = await prisma.user.create({
        data: {
          email: faker.internet.exampleEmail({
            firstName: faker.string.uuid(),
          }),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          username: faker.string.sample(20),
          feideId: faker.string.uuid(),
        },
      });
      const organization = await prisma.organization.create({
        data: {
          name: faker.string.sample(20),
        },
      });
      const event = await eventRepository.create(
        {
          name: faker.word.adjective(),
          startAt: faker.date.past(),
          endAt: faker.date.future(),
          contactEmail: faker.internet.email(),
          organizationId: organization.id,
        },
        {
          signUpsEnabled: true,
          capacity: 1,
          slots: [{ capacity: 1 }],
          signUpsStartAt: new Date(),
          signUpsEndAt: new Date(),
        },
      );
      const existingSlot = await prisma.eventSlot.findFirstOrThrow({
        where: {
          eventId: event.id,
        },
      });
      await eventRepository.createSignUp({
        eventId: event.id,
        userId: user.id,
        participationStatus: ParticipationStatus.CONFIRMED,
        slotId: existingSlot.id,
      });

      /**
       * Act
       *
       * 1. Update the event with a new slot
       */
      const actual = eventRepository.update(
        event.id,
        {},
        {
          slots: [{ id: existingSlot.id, capacity: 0 }],
          capacity: 1,
          signUpsEnabled: true,
          signUpsStartAt: new Date(),
          signUpsEndAt: new Date(),
        },
      );

      /**
       * Assert
       *
       * The update call should raise an InvalidCapacityError
       */
      await expect(actual).rejects.toThrow(InvalidCapacityError);
    });

    it("should set capacity for an event that did not previously have it", async () => {
      /**
       * Arrange
       *
       * 1. Create an organization to host the event
       * 1. Create an event
       */
      const organization = await prisma.organization.create({
        data: {
          name: faker.string.sample(20),
        },
      });
      const event = await eventRepository.create({
        name: faker.word.adjective(),
        startAt: faker.date.past(),
        endAt: faker.date.future(),
        contactEmail: faker.internet.email(),
        organizationId: organization.id,
      });

      /**
       * Act
       *
       * 1. Update the event with capacity and slots
       */
      const actual = await eventRepository.update(
        event.id,
        {},
        {
          slots: [{ capacity: 20 }],
          capacity: 10,
          signUpsEnabled: true,
          signUpsStartAt: new Date(),
          signUpsEndAt: new Date(),
        },
      );
      const slot = await prisma.eventSlot.findFirstOrThrow({
        where: {
          eventId: event.id,
        },
      });

      /**
       * Assert
       *
       * The event should have capacity
       */
      expect(actual.signUpDetails?.capacity).toBe(10);
      expect(actual.signUpDetails?.remainingCapacity).toBe(10);
      expect(actual.signUpsEnabled).toBe(true);
      expect(slot.capacity).toBe(20);
      expect(slot.remainingCapacity).toBe(20);
    });
  });
});

import { faker } from "@faker-js/faker";
import { ParticipationStatus } from "@prisma/client";
import { range } from "lodash-es";

import { InvalidCapacityError } from "@/domain/events.js";
import prisma from "@/lib/prisma.js";

import { EventRepository } from "../../repository.js";

describe("EventRepository", () => {
  let eventRepository: EventRepository;

  beforeAll(() => {
    eventRepository = new EventRepository(prisma);
  });

  describe("update capacity", () => {
    interface TestCase {
      name: string;
      arrange: {
        capacity?: number;
      };
      act: {
        capacity: number;
      };
      assert: {
        capacity: number;
        remainingCapacity: number;
      };
    }

    const testCases: TestCase[] = [
      {
        name: "should update the capacity when the capacity is null",
        arrange: {
          capacity: undefined,
        },
        act: {
          capacity: 10,
        },
        assert: {
          capacity: 10,
          remainingCapacity: 10,
        },
      },
      {
        name: "should increment the remaining capacity when the change is positive",
        arrange: {
          capacity: 10,
        },
        act: {
          capacity: 20,
        },
        assert: {
          capacity: 20,
          remainingCapacity: 20,
        },
      },
      {
        name: "should decrement the remaining capacity when the change is positive",
        arrange: {
          capacity: 20,
        },
        act: {
          capacity: 10,
        },
        assert: {
          capacity: 10,
          remainingCapacity: 10,
        },
      },
      {
        name: "should decrement the remaining capacity when the change is positive",
        arrange: {
          capacity: 20,
        },
        act: {
          capacity: 10,
        },
        assert: {
          capacity: 10,
          remainingCapacity: 10,
        },
      },
    ];

    test.each(testCases)("$name", async ({ arrange, act, assert }) => {
      /**
       * Arrange
       *
       * 1. Create an organization
       * 2. Create an event with capacity arrange.capacity
       */
      const organization = await prisma.organization.create({
        data: {
          name: faker.string.sample(20),
        },
      });

      const event = await eventRepository.create({
        name: faker.word.adjective(),
        description: faker.lorem.paragraph(),
        capacity: arrange.capacity,
        startAt: faker.date.past(),
        endAt: faker.date.future(),
        organizationId: organization.id,
        contactEmail: faker.internet.email(),
      });

      /**
       *
       * Act
       *
       * 1. Update the event capacity to act.capacity
       */
      const actual = await eventRepository.update(event.id, {
        capacity: act.capacity,
      });

      /**
       * Assert
       *
       * 1. The remaining capacity should be cahnged
       * 2. The capacity should be changed
       */
      expect(actual.capacity).toBe(assert.capacity);
      expect(actual.remainingCapacity).toBe(assert.remainingCapacity);
    });
  });

  describe("update capacity with sign ups", () => {
    interface TestCase {
      name: string;
      arrange: {
        capacity: number;
        signUps: number;
      };
      act: {
        capacity: number;
      };
      assert: {
        capacity: number;
        remainingCapacity: number;
      };
    }

    const testCases: TestCase[] = [
      {
        name: "should increment the remaining capacity when the change is positive",
        arrange: {
          signUps: 10,
          capacity: 10,
        },
        act: {
          capacity: 20,
        },
        assert: {
          capacity: 20,
          remainingCapacity: 10,
        },
      },
      {
        name: "should decrement the remaining capacity when the change is negative, as long as the remaining capacity remains positive",
        arrange: {
          signUps: 10,
          capacity: 20,
        },
        act: {
          capacity: 10,
        },
        assert: {
          capacity: 10,
          remainingCapacity: 0,
        },
      },
    ];

    test.each(testCases)("$name", async ({ arrange, act, assert }) => {
      /**
       * Arrange
       *
       * 1. Create an organization
       * 2. Create an event with capacity arrange.capacity
       */
      const organization = await prisma.organization.create({
        data: {
          name: faker.string.sample(20),
        },
      });

      const event = await eventRepository.create({
        name: faker.word.adjective(),
        description: faker.lorem.paragraph(),
        capacity: arrange.capacity,
        startAt: faker.date.past(),
        endAt: faker.date.future(),
        organizationId: organization.id,
        contactEmail: faker.internet.email(),
        slots: [{ capacity: arrange.capacity }],
      });

      await Promise.all(
        range(arrange.signUps).map(async () => {
          const user = await prisma.user.create({
            data: {
              email: faker.internet.exampleEmail({ firstName: faker.string.uuid() }),
              firstName: faker.person.firstName(),
              lastName: faker.person.lastName(),
              username: faker.string.sample(20),
              feideId: faker.string.uuid(),
            },
          });
          await eventRepository.createSignUp({
            userId: user.id,
            participationStatus: ParticipationStatus.CONFIRMED,
            // Since we created this slot with the event, we know that it exists for this test
            slotId: event.slots[0]!.id,
            eventId: event.id,
          });
        })
      );

      /**
       *
       * Act
       *
       * 1. Update the event capacity to act.capacity
       */
      const actual = await eventRepository.update(event.id, {
        capacity: act.capacity,
      });

      /**
       * Assert
       *
       * 1. The remaining capacity should be cahnged
       * 2. The capacity should be changed
       */
      expect(actual.capacity).toBe(assert.capacity);
      expect(actual.remainingCapacity).toBe(assert.remainingCapacity);
    });

    describe("update capacity with sign ups should raise", () => {
      it("should raise when the remaining capacity would be negative", async () => {
        /**
         * Arrange
         *
         * 1. Create an organization
         * 2. Create an event with capacity 1
         * 3. Create a sign up for the event
         */
        const organization = await prisma.organization.create({
          data: {
            name: faker.string.sample(20),
          },
        });

        const event = await eventRepository.create({
          name: faker.word.adjective(),
          description: faker.lorem.paragraph(),
          capacity: 1,
          startAt: faker.date.past(),
          endAt: faker.date.future(),
          organizationId: organization.id,
          contactEmail: faker.internet.email(),
          slots: [{ capacity: 1 }],
        });

        const user = await prisma.user.create({
          data: {
            email: faker.internet.email(),
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            username: faker.string.sample(20),
            feideId: faker.string.uuid(),
          },
        });

        await eventRepository.createSignUp({
          userId: user.id,
          participationStatus: ParticipationStatus.CONFIRMED,
          // Since we created this slot with the event, we know that it exists for this test
          slotId: event.slots[0]!.id,
          eventId: event.id,
        });

        /**
         * Act
         *
         * 1. Update the event capacity to 0
         */
        const actual = eventRepository.update(event.id, {
          capacity: 0,
        });

        /**
         * Assert
         *
         * 1. The update should raise
         */
        await expect(actual).rejects.toThrow(InvalidCapacityError);
      });
    });

    it("stress test should end up with the correct remaining capacity", async () => {
      /**
       * Arrange
       *
       * 1. Create an organization
       * 2. Create an event with capacity 1
       * 3. Create a sign up for the event
       */
      const organization = await prisma.organization.create({
        data: {
          name: faker.string.sample(20),
        },
      });

      const event = await eventRepository.create({
        name: faker.word.adjective(),
        description: faker.lorem.paragraph(),
        capacity: 1,
        startAt: faker.date.past(),
        endAt: faker.date.future(),
        organizationId: organization.id,
        contactEmail: faker.internet.email(),
        slots: [{ capacity: 1 }],
      });

      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          username: faker.string.sample(20),
          feideId: faker.string.uuid(),
        },
      });

      await eventRepository.createSignUp({
        userId: user.id,
        participationStatus: ParticipationStatus.CONFIRMED,
        // Since we created this slot with the event, we know that it exists for this test
        slotId: event.slots[0]!.id,
        eventId: event.id,
      });

      /**
       * Act
       *
       * 1. Update the event capacity to 0
       */
      const capacities = range(-1000, 1000);
      const actual = await Promise.allSettled(
        capacities.map(async (capacity) => {
          return eventRepository.update(event.id, {
            capacity,
          });
        })
      );

      /**
       * Assert
       *
       * All updates where capacity >= 1 should succeed
       */
      capacities.forEach((capacity, index) => {
        const result = actual[index];
        if (result === undefined) return fail(`Expected result for index ${index} to be defined`);
        if (result.status === "fulfilled") {
          expect(result.value.capacity).toBe(capacity);
          expect(result.value.remainingCapacity).toBe(capacity - 1);
          expect(capacity).toBeGreaterThanOrEqual(1);
        } else {
          expect(result.reason).toBeInstanceOf(InvalidCapacityError);
        }
      });
    });
  });
});

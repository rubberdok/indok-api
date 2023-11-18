import { ParticipationStatus, Event, EventSignUp, EventSlot, PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";

import { NotFoundError } from "@/domain/errors.js";

export class EventRepository {
  constructor(private db: PrismaClient) {}

  /**
   * Create a new event.
   *
   * @param data.name - The name of the event
   * @param data.description - The description of the event
   * @param data.startAt - The start datetime of the event
   * @param data.endAt - The end datetime of the event
   * @param data.organizationId - The ID of the organization that the event belongs to
   * @param data.organizerId - The ID of the user that is the organizer of the event
   * @returns The created event
   */
  async create(data: {
    name: string;
    description?: string;
    startAt: Date;
    endAt: Date;
    organizationId: string;
    organizerId: string;
  }): Promise<Event> {
    const { name, description, startAt, organizationId, endAt, organizerId } = data;
    return this.db.event.create({
      data: {
        name: name,
        description,
        startAt,
        endAt,
        organizationId,
        organizerId,
      },
    });
  }

  /**
   * Update an event
   *
   * Values that are undefined will be left unchanged.
   * @param id - The ID of the event to update
   * @param data.name - The new name of the event
   * @param data.description - The new description of the event
   * @param data.startAt - The new start datetime of the event
   * @param data.endAt - The new end datetime of the event
   * @returns The updated event
   */
  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      startAt?: Date;
      endAt?: Date;
    }
  ) {
    const { name, description, startAt, endAt } = data;
    return this.db.event.update({
      data: {
        name,
        description,
        startAt,
        endAt,
      },
      where: {
        id,
      },
    });
  }

  /**
   * Create a new sign up for an event slot on an event.
   *
   * Uses version numbers for slot and event to ensure that the slot and event has not been updated since we last saw it.
   * If the slot or event has been updated, a NotFoundError is thrown, and the sign up is not created.
   * If this happens, it is recommended to refetch the event and the slot, and, unless they now have no spots left, call this method again
   * with the new version numbers.
   *
   * @throws {NotFoundError} If an event or event slot with the given ID and version does not exist, or if the event or event slot does not have any spots left.
   * @param userId - The ID of the user to sign up for the event
   * @param event.version - The version of the event to sign up for, used for optimistic concurrency control to ensure that the event has not been updated since we last saw it.
   * @param event.id - The ID of the event to sign up for
   * @param slot.version - The version of the event slot to sign up for, used for optimistic concurrency control to ensure that the event slot has not been updated since we last saw it.
   * @param slot.id - The ID of the event slot to sign up for
   * @returns The created event sign up, the updated event slot and the updated event
   */
  async createConfirmedSignUp(
    userId: string,
    event: { id: string; version: number },
    slot: { id: string; version: number }
  ): Promise<{ signUp: EventSignUp; eventSlot: EventSlot; event: Event }> {
    try {
      const [signUp, updatedSlot, updatedEvent] = await this.db.$transaction([
        this.db.eventSignUp.create({
          data: {
            userId,
            participationStatus: ParticipationStatus.CONFIRMED,
            slotId: slot.id,
            eventId: event.id,
          },
        }),

        this.db.eventSlot.update({
          where: {
            id: slot.id,
            spots: {
              gt: 0,
            },
          },
          data: {
            version: {
              increment: 1,
            },
            spots: {
              decrement: 1,
            },
          },
        }),

        this.db.event.update({
          where: {
            id: event.id,
            spots: {
              gt: 0,
            },
          },
          data: {
            version: {
              increment: 1,
            },
            spots: {
              decrement: 1,
            },
          },
        }),
      ]);
      return { signUp, eventSlot: updatedSlot, event: updatedEvent };
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError) {
        const notFoundError = new NotFoundError(
          `Event{ id: ${event.id}, version: ${event.version} }, or EventSlot{ id: ${slot.id}, version: ${slot.version} } not found`
        );
        notFoundError.cause = err;
        throw notFoundError;
      }
      throw err;
    }
  }

  /**
   * Create a waitlist sign up for an event.
   *
   * Unlike createConfirmedSignUp, this method does not rely on version numbers for optimistic concurrency control
   * as wait list sign ups are not affected by the number of spots left.
   *
   * @param userId - The ID of the user to sign up for the event
   * @param event.id - The ID of the event to sign up for
   * @returns the event sign up
   */
  async createOnWaitlistSignUp(userId: string, event: { id: string }): Promise<EventSignUp> {
    try {
      const signUp = this.db.eventSignUp.create({
        data: {
          eventId: event.id,
          userId,
          participationStatus: ParticipationStatus.ON_WAITLIST,
        },
      });
      return signUp;
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError) {
        throw new NotFoundError(`Event{ id: ${event.id} not found`);
      }
      throw err;
    }
  }

  /**
   * getSlotWithAvailableSpots returns the slot with the greatest number of available spots for the given event.
   *
   * @throws {NotFoundError} If there are no slots with available spots for the event
   * @param eventId - The ID of the event to get a slot for
   * @returns The slot with the greatest number of available spots for the given event
   */
  async getSlotWithAvailableSpots(eventId: string): Promise<EventSlot> {
    const slot = await this.db.eventSlot.findFirst({
      where: {
        eventId,
        spots: {
          gt: 0,
        },
      },
      orderBy: {
        spots: "desc",
      },
    });

    if (slot === null) {
      throw new NotFoundError(`No slots with available spots for event { id: ${eventId} }`);
    }

    return slot;
  }

  /**
   * get returns the event with the given ID.
   *
   * @throws {NotFoundError} If an event with the given ID does not exist
   */
  async get(id: string): Promise<Event> {
    const event = await this.db.event.findUnique({
      where: {
        id,
      },
    });

    if (event === null) {
      throw new NotFoundError(`Event { id: ${id} } not found`);
    }

    return event;
  }
}

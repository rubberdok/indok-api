import { Event, EventSignUp, EventSlot, ParticipationStatus, PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";

import { InternalServerError, NotFoundError } from "@/domain/errors.js";

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
   * @param data.contactEamil - The email address of the contact person for the event
   * @returns The created event
   */
  async create(data: {
    name: string;
    description?: string;
    startAt: Date;
    endAt: Date;
    organizationId: string;
    contactEmail: string;
    capacity?: number;
    slots?: { capacity: number }[];
  }): Promise<Event> {
    const { name, description, startAt, organizationId, endAt, contactEmail, capacity } = data;
    const slots = data.slots?.map((slot) => ({ remainingCapacity: slot.capacity }));
    if (slots && slots.length > 0) {
      return this.db.event.create({
        data: {
          name: name,
          description,
          startAt,
          endAt,
          organizationId,
          contactEmail,
          remainingCapacity: capacity,
          slots: {
            createMany: {
              data: slots,
            },
          },
        },
      });
    }
    return this.db.event.create({
      data: {
        name: name,
        description,
        startAt,
        endAt,
        organizationId,
        contactEmail,
        remainingCapacity: capacity,
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
   * If this happens, it is recommended to refetch the event and the slot, and, unless they now have no capacity left, call this method again
   * with the new version numbers.
   *
   * @throws {NotFoundError} If an event or event slot with the given ID and version does not exist, or if the event or event slot does not have any capacity left.
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
            remainingCapacity: {
              gt: 0,
            },
          },
          data: {
            version: {
              increment: 1,
            },
            remainingCapacity: {
              decrement: 1,
            },
          },
        }),

        this.db.event.update({
          where: {
            id: event.id,
            remainingCapacity: {
              gt: 0,
            },
          },
          data: {
            version: {
              increment: 1,
            },
            remainingCapacity: {
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
   * as wait list sign ups are not affected by the remaining capacity
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
   * getSlotWithRemainingCapacity returns the slot with the greatest number of remaining capacity for the given event.
   *
   * @throws {NotFoundError} If there are no slots with remaining capacity for the event
   * @param eventId - The ID of the event to get a slot for
   * @returns The slot with the greatest number of remaining capacity for the given event
   */
  async getSlotWithRemainingCapacity(eventId: string): Promise<EventSlot> {
    const slot = await this.db.eventSlot.findFirst({
      where: {
        eventId,
        remainingCapacity: {
          gt: 0,
        },
      },
      orderBy: {
        remainingCapacity: "desc",
      },
    });

    if (slot === null) {
      throw new NotFoundError(`No slots with remaining capacity for event { id: ${eventId} }`);
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

  /**
   * findMany returns a list of events.
   * @param data.endAtGte - Only return events that end after this date
   * @returns A list of events
   */
  async findMany(data?: { endAtGte?: Date }): Promise<Event[]> {
    if (data) {
      const { endAtGte } = data;
      return this.db.event.findMany({
        where: {
          endAt: {
            gte: endAtGte,
          },
        },
      });
    }

    return this.db.event.findMany();
  }

  /**
   * findManySignUps returns a list of event sign ups with the given status for the event, ordered by the time they were created.
   *
   * @param eventId - The ID of the event to get sign ups for
   * @param status - The status of the sign ups to get
   * @returns A list of event sign ups
   */
  async findManySignUps(data: { eventId: string; status: ParticipationStatus }): Promise<EventSignUp[]> {
    const { eventId, status } = data;
    return this.db.eventSignUp.findMany({
      where: {
        eventId,
        participationStatus: status,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  /**
   * makeConfirmedSignUp updates a sign up to be confirmed, and updates the event and event slot to reflect this.
   *
   * @throws {NotFoundError} If the event, event slot or event sign up does not exist, or if the event or event slot does not have any remaining capacity.
   * @param data.signUpId - The ID of the event sign up to confirm
   * @param data.slotId - The ID of the event slot to confirm the sign up for
   * @param data.eventId - The ID of the event to confirm the sign up for
   * @returns The updated event sign up
   */
  async makeConfirmedSignUp(data: {
    signUp: { id: string; version: number };
    slotId: string;
    eventId: string;
  }): Promise<{ signUp: EventSignUp; event: Event; slot: EventSlot }> {
    const { signUp, slotId, eventId } = data;
    try {
      const [eventSignUp, slot, event] = await this.db.$transaction([
        this.db.eventSignUp.update({
          where: {
            id: signUp.id,
            version: signUp.version,
          },
          data: {
            participationStatus: ParticipationStatus.CONFIRMED,
            version: {
              increment: 1,
            },
          },
        }),
        this.db.eventSlot.update({
          where: {
            id: slotId,
            remainingCapacity: {
              gt: 0,
            },
          },
          data: {
            remainingCapacity: {
              decrement: 1,
            },
          },
        }),
        this.db.event.update({
          where: {
            id: eventId,
            remainingCapacity: {
              gt: 0,
            },
          },
          data: {
            remainingCapacity: {
              decrement: 1,
            },
          },
        }),
      ]);
      return { signUp: eventSignUp, event, slot };
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === "P2025") throw new NotFoundError(err.message);
        throw err;
      }
    }
    throw new InternalServerError("An unexpected error occurred");
  }
}

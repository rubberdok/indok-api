import { Event, EventSignUp, EventSlot, ParticipationStatus, Prisma, PrismaClient } from "@prisma/client";
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
   * createSignUp creates a new sign up for the event with the given participation status, and updates the event and event slot to reflect this.
   * @throws {NotFoundError} If the event or event slot does not exist, or if the event or event slot does not fulfill the capacity requirements.
   * @param data.userId - The ID of the user to sign up for the event
   * @param data.participationStatus - The participation status of the sign up
   * @param data.event.id - The ID of the event to sign up for
   * @param data.event.decrement - if `true` then decrement the remaining capacity of the event
   * @param data.event.capacityGt - if `true` then only update the event if the remaining capacity is greater than this value
   * @param data.slot.id - The ID of the slot to sign up for
   * @param data.slot.decrement - if `true` then decrement the remaining capacity of the slot
   * @param data.slot.capacityGt - if `true` then only update the slot if the remaining capacity is greater than this value
   * @returns The created sign up, and the updated event and slot
   */
  public async createSignUp(data: {
    userId: string;
    participationStatus: ParticipationStatus;
    event: {
      id: string;
      decrement?: boolean;
      capacityGt?: number;
    };
    slot?: {
      id: string;
      decrement?: boolean;
      capacityGt?: number;
    };
  }): Promise<{ signUp: EventSignUp; slot?: EventSlot; event: Event }> {
    try {
      const { userId, participationStatus, event, slot } = data;
      const { eventUpdateData, eventSlotUpdateData } = this.getSignUpUpdateData({ event, slot });

      /**
       * We are creating a sign up for a slot,
       * so we make sure to update all three tables in a transaction.
       */
      if (eventSlotUpdateData && slot) {
        const [signUp, updatedEvent, updatedEventSlot] = await this.db.$transaction([
          this.db.eventSignUp.create({
            data: {
              userId,
              participationStatus,
              eventId: event.id,
              slotId: slot.id,
            },
          }),
          this.db.event.update(eventUpdateData),
          this.db.eventSlot.update(eventSlotUpdateData),
        ]);
        return { signUp, event: updatedEvent, slot: updatedEventSlot };
      } else {
        /**
         * We are creating a sign up for an event without a slot,
         * so we only need to update the event and the sign up.
         */
        const { eventUpdateData } = this.getSignUpUpdateData({ event });
        const [signUp, updatedEvent] = await this.db.$transaction([
          this.db.eventSignUp.create({
            data: {
              userId,
              participationStatus,
              eventId: event.id,
            },
          }),
          this.db.event.update(eventUpdateData),
        ]);
        return { signUp, event: updatedEvent, slot: undefined };
      }
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError) {
        /**
         * If the event or slot does not exist, or if the remaining capacity is not greater than the capacityGt value,
         * then throw a NotFoundError.
         */
        if (err.code === "P2025") throw new NotFoundError(err.message);
      }
      throw err;
    }
  }

  /**
   * updateSignUp - updates the participation status of the sign up with matching id and version,
   * and if event or slot is provided, updates the remaining capacity accordingly.
   *
   * @param data.signUp - The sign up to update
   * @param data.signUp.id - The ID of the sign up to update
   * @param data.signUp.version - The version of the sign up to update
   * @param data.newParticipationStatus - The new participation status of the sign up
   * @param data.newSlotId - The new slot ID of the sign up, null removes the sign up from the slot
   * @param data.event - The event to update
   * @param data.event.increment - if `true` then increment the remaining capacity of the event
   * @param data.event.decrement - if `true` then decrement the remaining capacity of the event
   * @param data.event.capacityGt - if `true` then only update the event if the remaining capacity is greater than this value
   * @param data.slot - The slot to update
   * @param data.slot.increment - if `true` then increment the remaining capacity of the slot
   * @param data.slot.decrement - if `true` then decrement the remaining capacity of the slot
   * @param data.slot.capacityGt - if `true` then only update the slot if the remaining capacity is greater than this value
   * @returns The updated sign up, event and slot
   */
  public async updateSignUp(data: {
    signUp: { id: string; version: number };
    newParticipationStatus: ParticipationStatus;
    newSlotId?: string | null;
    event: {
      id: string;
      increment?: boolean;
      decrement?: boolean;
      capacityGt?: number;
    };
    slot?: {
      id: string;
      increment?: boolean;
      decrement?: boolean;
      capacityGt?: number;
    };
  }): Promise<{ signUp: EventSignUp; event: Event; slot?: EventSlot }> {
    try {
      const { signUp, newParticipationStatus, newSlotId, ...updates } = data;
      const { eventUpdateData, eventSlotUpdateData } = this.getSignUpUpdateData(updates);
      if (eventSlotUpdateData) {
        const [updatedSignUp, updatedEvent, updatedEventSlot] = await this.db.$transaction([
          this.db.eventSignUp.update({
            where: {
              id: signUp.id,
              version: signUp.version,
            },
            data: {
              participationStatus: newParticipationStatus,
              slotId: newSlotId,
              version: {
                increment: 1,
              },
            },
          }),
          this.db.event.update(eventUpdateData),
          this.db.eventSlot.update(eventSlotUpdateData),
        ]);
        return { signUp: updatedSignUp, event: updatedEvent, slot: updatedEventSlot };
      } else {
        const [updatedSignUp, updatedEvent] = await this.db.$transaction([
          this.db.eventSignUp.update({
            where: {
              id: signUp.id,
              version: signUp.version,
            },
            data: {
              participationStatus: newParticipationStatus,
              slotId: newSlotId,
              version: {
                increment: 1,
              },
            },
          }),
          this.db.event.update(eventUpdateData),
        ]);
        return { signUp: updatedSignUp, event: updatedEvent };
      }
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === "P2025") throw new NotFoundError(err.message);
      }
      throw err;
    }
  }

  /**
   * getSignUpUpdateData returns the update data for the event and slot related to the sign up
   * @param data.event - The event to update
   * @param data.event.increment - if `true` then increment the remaining capacity of the event
   * @param data.event.decrement - if `true` then decrement the remaining capacity of the event
   * @param data.event.capacityGt - if `true` then only update the event if the remaining capacity is greater than this value
   * @param data.slot - The slot to update
   * @param data.slot.increment - if `true` then increment the remaining capacity of the slot
   * @param data.slot.decrement - if `true` then decrement the remaining capacity of the slot
   * @param data.slot.capacityGt - if `true` then only update the slot if the remaining capacity is greater than this value
   * @returns The update data for the event and slot
   */
  private getSignUpUpdateData(data: {
    event: { id: string; increment?: boolean; decrement?: boolean; capacityGt?: number };
    slot?: { id: string; increment?: boolean; decrement?: boolean; capacityGt?: number };
  }): { eventUpdateData: Prisma.EventUpdateArgs; eventSlotUpdateData?: Prisma.EventSlotUpdateArgs } {
    const { event, slot } = data;
    let eventUpdateData: Prisma.EventUpdateArgs = { data: {}, where: { id: event.id } };
    let eventSlotUpdateData: Prisma.EventSlotUpdateArgs | undefined = undefined;

    if (event.increment) {
      /**
       * If the remaining capacity >= capacityGt, then increment the remaining capacity by 1
       */
      eventUpdateData = {
        where: {
          id: event.id,
          remainingCapacity: {
            gt: event.capacityGt,
          },
        },
        data: {
          remainingCapacity: {
            increment: 1,
          },
          version: {
            increment: 1,
          },
        },
      };
    } else if (event.decrement) {
      /**
       * If the remaining capacity >= capacityGt, then decrement the remaining capacity by 1
       */
      eventUpdateData = {
        where: {
          id: event.id,
          remainingCapacity: {
            gt: event.capacityGt,
          },
        },
        data: {
          remainingCapacity: {
            decrement: 1,
          },
          version: {
            increment: 1,
          },
        },
      };
    } else {
      /**
       * If the remaining capacity >= capacityGt, then simply increment the version
       */
      eventUpdateData = {
        where: {
          id: event.id,
          remainingCapacity: {
            gt: event.capacityGt,
          },
        },
        data: {
          version: {
            increment: 1,
          },
        },
      };
    }

    if (slot?.increment) {
      /**
       * If the remaining capacity >= capacityGt, then increment the remaining capacity by 1
       */
      eventSlotUpdateData = {
        where: {
          id: slot.id,
          remainingCapacity: {
            gt: slot.capacityGt,
          },
        },
        data: {
          remainingCapacity: {
            increment: 1,
          },
          version: {
            increment: 1,
          },
        },
      };
    } else if (slot?.decrement) {
      /**
       * If the remaining capacity >= capacityGt, then decrement the remaining capacity by 1
       */
      eventSlotUpdateData = {
        where: {
          id: slot.id,
          remainingCapacity: {
            gt: slot.capacityGt,
          },
        },
        data: {
          remainingCapacity: {
            decrement: 1,
          },
          version: {
            increment: 1,
          },
        },
      };
    } else if (slot) {
      /**
       * If the remaining capacity >= capacityGt, then simply increment the version
       */
      eventSlotUpdateData = {
        where: {
          id: slot.id,
          remainingCapacity: {
            gt: slot.capacityGt,
          },
        },
        data: {
          version: {
            increment: 1,
          },
        },
      };
    }

    return { eventSlotUpdateData, eventUpdateData };
  }

  /**
   * getSignUp returns the sign up with the given ID.
   * @throws {NotFoundError} If a sign up with the given ID does not exist
   * @param id - The ID of the sign up to get
   * @returns the sign up with the given ID
   */
  async getSignUp(id: string): Promise<EventSignUp> {
    const signUp = await this.db.eventSignUp.findUnique({
      where: {
        id,
      },
    });

    if (signUp === null) {
      throw new NotFoundError(`Event sign up { id: ${id} } not found`);
    }

    return signUp;
  }
}

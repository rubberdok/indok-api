import { Event, EventSignUp, EventSlot, ParticipationStatus, PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";

import { InternalServerError, InvalidArgumentError, NotFoundError } from "@/domain/errors.js";
import { AlreadySignedUpError } from "@/domain/events.js";

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
   * Create a new sign up for the event the given participation status. All newly created events are set as active,
   * which is either `ON_WAITLIST` or `CONFIRMED`. While creating the sign up, the remaining capacity of the event and slot
   * is decremented by 1.
   *
   * @throws {AlreadySignedUpError} If the user has an active sign up for the event, i.e. a sign up with status `ON_WAITLIST` or `CONFIRMED`
   * @throws {NotFoundError} If the event or event slot does not exist, or if the event or event slot does not fulfill the capacity requirements.
   * @param data.userId - The ID of the user to sign up for the event
   * @param data.participationStatus - The participation status of the sign up
   * @param data.eventId - The ID of the event to sign up for
   * @param data.slotId - The ID of the slot to sign up for
   * @returns The created sign up, and the updated event and slot
   */
  public async createSignUp(
    data: CreateConfirmedSignUpData
  ): Promise<{ event: Event; signUp: EventSignUp; slot: EventSlot }>;
  /**
   * Create a new sign up for the event the given participation status. All newly created events are set as active,
   * which is either `ON_WAITLIST` or `CONFIRMED`. Leaves the remaining capacity of the event and slot unchanged.
   *
   * @throws {AlreadySignedUpError} If the user has an active sign up for the event, i.e. a sign up with status `ON_WAITLIST` or `CONFIRMED`
   * @throws {NotFoundError} If the event or event slot does not exist, or if the event or event slot does not fulfill the capacity requirements.
   * @param data.userId - The ID of the user to sign up for the event
   * @param data.participationStatus - The participation status of the sign up
   * @param data.eventId - The ID of the event to sign up for
   * @returns The created sign up, and the updated event and slot
   */
  public async createSignUp(data: CreateOnWaitlistSignUpData): Promise<{ event: Event; signUp: EventSignUp }>;

  /**
   * Create a new sign up for the event the given participation status. All newly created events are set as active,
   * which is either `ON_WAITLIST` or `CONFIRMED`. If the participation status is `CONFIRMED`, then the remaining capacity of the event and slot
   * is decremented by 1. If the participation status is `ON_WAITLIST`, then the remaining capacity of the event and slot is left unchanged.
   *
   * @throws {AlreadySignedUpError} If the user has an active sign up for the event, i.e. a sign up with status `ON_WAITLIST` or `CONFIRMED`
   * @throws {NotFoundError} If the event or event slot does not exist, or if the event or event slot does not fulfill the capacity requirements.
   * @param data.userId - The ID of the user to sign up for the event
   * @param data.participationStatus - The participation status of the sign up
   * @param data.eventId - The ID of the event to sign up for
   * @param data.slotId - The ID of the slot to sign up for
   * @returns The created sign up, and the updated event and slot
   */
  public async createSignUp(
    data: CreateConfirmedSignUpData | CreateOnWaitlistSignUpData
  ): Promise<{ event: Event; signUp: EventSignUp; slot?: EventSlot }> {
    try {
      if ("slotId" in data) {
        return await this.createConfirmedSignUp(data);
      } else {
        return await this.createOnWaitlistSignUp(data);
      }
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === "P2002") throw new AlreadySignedUpError(err.message);
        if (err.code === "P2025") throw new NotFoundError(err.message);
      }
      throw err;
    }
  }

  private async createConfirmedSignUp(data: CreateConfirmedSignUpData) {
    const { eventId, userId, participationStatus, slotId } = data;
    const updatedEvent = await this.db.event.update({
      include: {
        slots: {
          where: {
            id: slotId,
          },
        },
        signUps: {
          where: {
            userId,
            eventId,
            active: true,
          },
        },
      },
      where: {
        id: eventId,
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
        slots: {
          update: {
            where: {
              id: slotId,
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
          },
        },
        signUps: {
          create: {
            slotId,
            userId,
            active: true,
            participationStatus,
          },
        },
      },
    });

    const { slots, signUps, ...event } = updatedEvent;
    const [slot] = slots;
    const [signUp] = signUps;
    if (slot === undefined) throw new InternalServerError("Expected exactly one slot to be updated");
    if (signUp === undefined) throw new InternalServerError("Expected exactly one sign up to be created");
    return { event, slot, signUp };
  }

  private async createOnWaitlistSignUp(data: CreateOnWaitlistSignUpData) {
    const { eventId, userId, participationStatus } = data;
    const updatedEvent = await this.db.event.update({
      include: {
        signUps: {
          where: {
            userId,
            eventId,
            active: true,
          },
        },
      },
      where: {
        id: eventId,
      },
      data: {
        version: {
          increment: 1,
        },
        signUps: {
          create: {
            userId,
            active: true,
            participationStatus,
          },
        },
      },
    });

    const { signUps, ...event } = updatedEvent;
    const [signUp] = signUps;
    if (signUp === undefined) throw new InternalServerError("Expected exactly one sign up to be created");
    return { event, signUp };
  }

  /**
   * updateSignUp - updates the participation status for the active sign up for the given user and event,
   * confirming it and adding it to the slot. Updating a sign up from the wait list to confirmed decrements
   * the remaining capacity of the event and slot by 1.
   *
   * @throws {InvalidArgumentError} - if no active sign ups are found
   * @throws {InvalidArgumentError} - if the current participation status is not ON_WAITLIST
   * @param data.userId - The ID of the user to update the sign up for
   * @param data.eventId - The ID of the event to update the sign up for
   * @param data.slotId - The ID of the slot to update the sign up for
   * @returns The updated sign up, event and slot
   */
  public async updateSignUp(
    data: UpdateToConfirmedSignUpData
  ): Promise<{ event: Event; signUp: EventSignUp; slot: EventSlot }>;
  /**
   * updateSignUp - updates the participation status for the active sign up for the given user and event to
   * one of the inactive statuses. If the current participation status CONFIRMED, the sign up is removed from the slot
   * and the remaining capacity of the event and slot is incremented by 1. If the current participation status is ON_WAITLIST,
   * the remaining capacity of the event and slot is left unchanged.
   *
   * @throws {InvalidArgumentError} - if no active sign ups are found
   * @throws {InvalidArgumentError} - if the current participation status is not ON_WAITLIST or CONFIRMED
   * @param data.userId - The ID of the user to update the sign up for
   * @param data.eventId - The ID of the event to update the sign up for
   * @param data.newParticipationStatus - The new participation status of the sign up
   * @returns The updated sign up and event
   */
  public async updateSignUp(
    data: UpdateToInactiveSignUpData
  ): Promise<{ event: Event; signUp: EventSignUp; slot: undefined }>;
  /**
   * updateSignUp - updates the participation status for the active sign up for the given user and event to
   * to data.newParticipationStatus.
   * - If the current participation status is CONFIRMED, and the new participation status
   * is REMOVED or RETRACTED, the sign up is removed from the slot and the remaining capacity of the event and slot is incremented by 1.
   *
   * - If the current participation status is ON_WAITLIST, and the new participation status is REMOVED or RETRACTED,
   * the remaining capacity of the event and slot is left unchanged.
   *
   * - If the current participation status is ON_WAITLIST, and the new participation status is CONFIRMED,
   * the sign up is promoted from the wait list to confirmed, and the remaining capacity of the event and slot is decremented by 1.
   *
   * - Otherwise, an InvalidArgumentError is thrown.
   *
   * @throws {InvalidArgumentError} - if no active sign ups are found
   * @throws {InvalidArgumentError} - if the current participation status is not ON_WAITLIST or CONFIRMED
   * @param data.userId - The ID of the user to update the sign up for
   * @param data.eventId - The ID of the event to update the sign up for
   * @param data.slotId - The ID of the slot to update the sign up for
   * @param data.newParticipationStatus - The new participation status of the sign up
   * @returns The updated sign up, event and slot
   */
  public async updateSignUp(
    data: UpdateToConfirmedSignUpData | UpdateToInactiveSignUpData
  ): Promise<{ event: Event; signUp: EventSignUp; slot?: EventSlot | null }> {
    const currentSignUp = await this.db.eventSignUp.findUnique({
      include: {
        event: true,
        slot: true,
      },
      where: {
        userId_eventId_active: {
          userId: data.userId,
          eventId: data.eventId,
          active: true,
        },
      },
    });

    if (currentSignUp === null) {
      throw new InvalidArgumentError("Can only change the status of an active sign up, and none were found");
    }

    try {
      const currentParticipationStatus = currentSignUp.participationStatus;
      const { newParticipationStatus } = data;

      if (currentParticipationStatus === newParticipationStatus) {
        // No change, we can just return.
        const { event, slot, ...signUp } = currentSignUp;
        return { event, slot, signUp };
      }

      if (newParticipationStatus === ParticipationStatus.CONFIRMED) {
        switch (currentParticipationStatus) {
          case ParticipationStatus.ON_WAITLIST: {
            try {
              // Promote from wait list to confirmed
              return await this.makeOnWaitlistSignUpConfirmed({
                signUp: {
                  id: currentSignUp.id,
                  version: currentSignUp.version,
                  participationSatus: currentParticipationStatus,
                },
                eventId: data.eventId,
                slotId: data.slotId,
              });
            } catch (err) {
              if (err instanceof PrismaClientKnownRequestError) {
                if (err.code === "P2002") throw new AlreadySignedUpError(err.message);
              }
              throw err;
            }
          }
          case ParticipationStatus.REMOVED:
          // fallthrough
          case ParticipationStatus.RETRACTED:
          // fallthrough
          case ParticipationStatus.CONFIRMED: {
            throw new InvalidArgumentError("Only sign ups on the wait list can be changed to confirmed");
          }
        }
      }

      switch (currentParticipationStatus) {
        case ParticipationStatus.CONFIRMED:
        // fallthrough
        case ParticipationStatus.ON_WAITLIST: {
          try {
            // Demote from wait list or confirmed to removed or retracted
            // Don't need to check active here, as we already did that above
            return await this.makeActiveSignUpInactive({
              currentSignUp: {
                id: currentSignUp.id,
                version: currentSignUp.version,
                participationStatus: currentParticipationStatus,
              },
              userId: data.userId,
              eventId: data.eventId,
              newParticipationStatus: newParticipationStatus,
            });
          } catch (err) {
            if (err instanceof PrismaClientKnownRequestError) {
              // This would occur if we fail to delete an existing inactive sign up, which should not happen
              if (err.code === "P2002") throw new InternalServerError("Failed to demote sign up");
            }
            throw err;
          }
        }
        case ParticipationStatus.REMOVED:
        // fallthrough
        case ParticipationStatus.RETRACTED: {
          throw new InvalidArgumentError(
            "Only sign ups on the wait list or confirmed can be changed to removed or retracted"
          );
        }
      }
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === "P2025") throw new NotFoundError(err.message);
      }
      throw err;
    }
  }

  /**
   * makeOnWaitlistSignUpConfirmed changes a sign up from being on the wait list to being confirmed,
   * and decrements the remaining capacity of the slot and event by 1.
   * @param data
   * @returns
   */
  private async makeOnWaitlistSignUpConfirmed(data: {
    signUp: { id: string; version: number; participationSatus: Extract<ParticipationStatus, "ON_WAITLIST"> };
    eventId: string;
    slotId: string;
  }) {
    const { eventId, slotId, signUp } = data;

    const { event, slot, ...updatedSignUp } = await this.db.eventSignUp.update({
      include: {
        event: true,
        slot: true,
      },
      where: {
        id: signUp.id,
        version: signUp.version,
      },
      data: {
        participationStatus: ParticipationStatus.CONFIRMED,
        version: {
          increment: 1,
        },
        slot: {
          connect: {
            id: slotId,
          },
          update: {
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
              version: {
                increment: 1,
              },
            },
          },
        },
        event: {
          update: {
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
              version: {
                increment: 1,
              },
            },
          },
        },
      },
    });
    return { event, slot, signUp: updatedSignUp };
  }

  private async makeActiveSignUpInactive(data: {
    currentSignUp: {
      id: string;
      version: number;
      participationStatus: Extract<ParticipationStatus, "ON_WAITLIST" | "CONFIRMED">;
    };
    userId: string;
    eventId: string;
    newParticipationStatus: Extract<ParticipationStatus, "REMOVED" | "RETRACTED">;
  }) {
    const { userId, eventId, currentSignUp, newParticipationStatus } = data;

    let result: { event: Event } & EventSignUp;

    switch (currentSignUp.participationStatus) {
      case ParticipationStatus.ON_WAITLIST: {
        [, result] = await this.db.$transaction([
          this.db.eventSignUp.deleteMany({
            where: {
              userId,
              eventId,
              active: false,
            },
          }),
          this.db.eventSignUp.update({
            include: {
              event: true,
            },
            where: {
              id: currentSignUp.id,
              version: currentSignUp.version,
            },
            data: {
              version: {
                increment: 1,
              },
              participationStatus: newParticipationStatus,
              active: false,
            },
          }),
        ]);
        break;
      }
      case ParticipationStatus.CONFIRMED: {
        [, result] = await this.db.$transaction([
          this.db.eventSignUp.deleteMany({
            where: {
              userId,
              eventId,
              active: false,
            },
          }),
          this.db.eventSignUp.update({
            include: {
              event: true,
            },
            where: {
              id: currentSignUp.id,
              version: currentSignUp.version,
            },
            data: {
              version: {
                increment: 1,
              },
              participationStatus: newParticipationStatus,
              active: false,
              slot: {
                disconnect: true,
                update: {
                  data: {
                    remainingCapacity: {
                      increment: 1,
                    },
                    version: {
                      increment: 1,
                    },
                  },
                },
              },
              event: {
                update: {
                  data: {
                    remainingCapacity: {
                      increment: 1,
                    },
                    version: {
                      increment: 1,
                    },
                  },
                },
              },
            },
          }),
        ]);
        break;
      }
      default: {
        throw new InternalServerError("Unexpected participation status");
      }
    }

    const { event, ...updatedSignUp } = result;
    return { event, signUp: updatedSignUp };
  }

  /**
   * getSignUp returns the sign up for the user on the event.
   * @throws {NotFoundError} If a sign up with the given ID does not exist
   * @param userId - The ID of the user to get the sign up for
   * @param eventId - The ID of the event to get the sign up for
   * @returns the sign up that matches the given user and event IDs
   */
  async getSignUp(userId: string, eventId: string): Promise<EventSignUp> {
    const signUp = await this.db.eventSignUp.findUnique({
      where: {
        userId_eventId_active: {
          userId,
          eventId,
          active: true,
        },
      },
    });

    if (signUp === null) {
      throw new NotFoundError(`Event sign up { userId: ${userId}, eventId: ${eventId} } not found`);
    }

    return signUp;
  }
}

interface CreateConfirmedSignUpData {
  eventId: string;
  userId: string;
  slotId: string;
  participationStatus: Extract<ParticipationStatus, "CONFIRMED">;
}

interface CreateOnWaitlistSignUpData {
  eventId: string;
  userId: string;
  participationStatus: Extract<ParticipationStatus, "ON_WAITLIST">;
}

interface UpdateToConfirmedSignUpData {
  userId: string;
  eventId: string;
  slotId: string;
  newParticipationStatus: Extract<ParticipationStatus, "CONFIRMED">;
}

interface UpdateToInactiveSignUpData {
  userId: string;
  eventId: string;
  newParticipationStatus: Extract<ParticipationStatus, "REMOVED" | "RETRACTED">;
}

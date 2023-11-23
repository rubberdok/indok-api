import { Event, EventSignUp, EventSlot, ParticipationStatus } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import { merge } from "lodash-es";
import { z } from "zod";

import { InternalServerError, InvalidArgumentError, NotFoundError, PermissionDeniedError } from "@/domain/errors.js";
import { Role } from "@/domain/organizations.js";
import { User } from "@/domain/users.js";

interface CreateConfirmedSignUpData {
  userId: string;
  eventId: string;
  slotId: string;
  participationStatus: Extract<ParticipationStatus, "CONFIRMED">;
}

interface CreateOnWaitlistSignUpData {
  userId: string;
  eventId: string;
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

export interface EventRepository {
  create(data: {
    name: string;
    description?: string;
    startAt: Date;
    endAt: Date;
    organizationId: string;
    contactEmail?: string;
    location?: string;
    capacity?: number;
    slots?: { capacity: number }[];
  }): Promise<Event>;
  update(
    id: string,
    data: {
      name?: string;
      description?: string;
      startAt?: Date;
      endAt?: Date;
      location?: string;
    }
  ): Promise<Event>;
  get(id: string): Promise<Event>;
  getSlotWithRemainingCapacity(eventId: string): Promise<EventSlot | null>;
  findMany(data?: { endAtGte?: Date | null }): Promise<Event[]>;
  findManySignUps(data: { eventId: string; status: ParticipationStatus }): Promise<EventSignUp[]>;
  getSignUp(userId: string, eventId: string): Promise<EventSignUp>;
  createSignUp(
    data: CreateConfirmedSignUpData | CreateOnWaitlistSignUpData
  ): Promise<{ signUp: EventSignUp; slot?: EventSlot; event: Event }>;
  updateSignUp(
    data: UpdateToConfirmedSignUpData | UpdateToInactiveSignUpData
  ): Promise<{ signUp: EventSignUp; slot?: EventSlot; event: Event }>;
}

export interface UserService {
  get(id: string): Promise<User>;
}

interface Logger extends FastifyBaseLogger {}

export interface PermissionService {
  hasRole(data: { userId: string; organizationId: string; role: Role }): Promise<boolean>;
}

export class EventService {
  constructor(
    private eventRepository: EventRepository,
    private permissionService: PermissionService,
    private logger?: Logger
  ) {}
  /**
   * Create a new event
   * @throws {InvalidArgumentError} - If any values are invalid
   * @throws {PermissionDeniedError} - If the user does not have permission to create an event for the organization
   * @param userId - The ID of the user that is creating the event
   * @param organizationId - The ID of the organization that the event belongs to
   * @param data.name - The name of the event
   * @param data.description - The description of the event
   * @param data.startAt - The start datetime of the event, must be in the future
   * @param data.endAt - The end datetime of the event
   * @param data.location - The location of the event
   * @param data.contactEmail - The email address of the contact person for the event
   * @returns The created event
   */
  async create(
    userId: string,
    organizationId: string,
    data: {
      name: string;
      description?: string | null;
      startAt: Date;
      endAt?: Date | null;
      location?: string | null;
      capacity?: number | null;
      slots?: { capacity: number }[] | null;
      contactEmail?: string | null;
    }
  ) {
    const isMember = await this.permissionService.hasRole({
      userId,
      organizationId,
      role: Role.MEMBER,
    });

    if (isMember === false) {
      throw new PermissionDeniedError("You do not have permission to create an event for this organization.");
    }

    const schema = z
      .object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        startAt: z.date().min(new Date()),
        endAt: z.date().min(new Date()).optional(),
        location: z.string().max(100).optional(),
        capacity: z.number().int().min(0).optional(),
        slots: z.array(z.object({ capacity: z.number().int().min(0) })).optional(),
        contactEmail: z.string().email().optional(),
      })
      .refine((data) => (data.endAt ? data.startAt < data.endAt : true), {
        message: "End date must be after start date",
        path: ["endAt"],
      });

    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw new InvalidArgumentError(parsed.error.message);
    }

    const { name, description, startAt, location, slots, capacity, contactEmail } = parsed.data;
    let endAt = parsed.data.endAt;
    if (!endAt) {
      endAt = new Date(startAt.getTime() + 2 * 60 * 60 * 1000);
    }
    return await this.eventRepository.create({
      name,
      description,
      startAt,
      endAt,
      organizationId,
      location,
      contactEmail,
      capacity,
      slots,
    });
  }

  async update(
    userId: string,
    eventId: string,
    data: {
      name?: string;
      description?: string;
      startAt?: Date;
      endAt?: Date;
      location?: string;
    }
  ): Promise<Event> {
    const event = await this.eventRepository.get(eventId);
    if (!event.organizationId) {
      throw new InvalidArgumentError("Events that belong to deleted organizations cannot be updated.");
    }

    const isMember = await this.permissionService.hasRole({
      userId,
      organizationId: event.organizationId,
      role: Role.MEMBER,
    });

    if (isMember === true) {
      const changingStartAt = typeof data.startAt !== "undefined";
      const changingEndAt = typeof data.endAt !== "undefined";

      if (changingStartAt || changingEndAt) {
        const timeSchema = z
          .object({
            startAt: z.date().min(new Date()),
            endAt: z.date().min(new Date()),
          })
          .refine((data) => data.endAt > data.startAt, {
            message: "End date must be after start date",
            path: ["endAt"],
          });

        const parsedTime = timeSchema.safeParse(merge({}, event, data));

        if (!parsedTime.success) {
          throw new InvalidArgumentError(parsedTime.error.message);
        }
      }

      const schema = z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        location: z.string().max(100).optional(),
      });

      const parsed = schema.safeParse(data);
      if (!parsed.success) {
        throw new InvalidArgumentError(parsed.error.message);
      }

      return await this.eventRepository.update(eventId, data);
    } else {
      throw new PermissionDeniedError("You do not have permission to update this event.");
    }
  }

  /**
   * Sign up a user for an event. If there is no remaining capacity on the event, either because all avilable slots are
   * full, or because the event itself is full, the user will be added to the wait list.
   * This method will attempt a maximum of 20 times to sign up the user. If it fails, an InternalServerError is thrown.
   * If this happens, it is likely due to a high number of concurrent requests, and the user can try again.
   *
   * @throws {InvalidArgumentError} If the event does not have sign ups
   * @throws {InternalServerError} If the user could not be signed up after 20 attempts
   * @param userId - The ID of the user that is signing up
   * @param eventId - The ID of the event to sign up for
   * @returns The event sign up. If there is no remaining capacity on the event, either because all avilable slots are
   * full, or because the event itself is full, the user will be added to the wait list. The returned sign up will
   * either have a status of `CONFIRMED` or `WAIT_LIST`.
   */
  async signUp(userId: string, eventId: string): Promise<EventSignUp> {
    const maxAttempts = 20;
    /**
     * We may need to retry this multiple times, as we rely on optimistic concurrency control
     * to ensure that that the event and slot have not been updated since we last fetched them.
     * This is to avoid overfilling the event or slot during periods with a high number of concurrent requests.
     *
     * This number may need to be tweaked.
     */

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      this.logger?.info({ userId, eventId, attempt }, "Attempting to sign up user for event.");
      // Fetch the event to check if it has available slots or not
      const event = await this.eventRepository.get(eventId);
      if (event.remainingCapacity === null) {
        throw new InvalidArgumentError("This event does does not have sign ups.");
      }

      // If there is no remaining capacity on the event, it doesn't matter if there is any remaining capacity in slots.
      if (event.remainingCapacity <= 0) {
        this.logger?.info({ event }, "Event is full, adding user to wait list.");
        const { signUp } = await this.eventRepository.createSignUp({
          userId,
          participationStatus: ParticipationStatus.ON_WAITLIST,
          eventId,
        });
        return signUp;
      }

      try {
        const slotToSignUp = await this.eventRepository.getSlotWithRemainingCapacity(eventId);

        if (slotToSignUp === null) {
          this.logger?.info({ event }, "Event is full, adding user to wait list.");
          const { signUp } = await this.eventRepository.createSignUp({
            userId,
            participationStatus: ParticipationStatus.ON_WAITLIST,
            eventId,
          });
          return signUp;
        } else {
          const { signUp } = await this.eventRepository.createSignUp({
            userId,
            participationStatus: ParticipationStatus.CONFIRMED,
            eventId,
            slotId: slotToSignUp.id,
          });
          this.logger?.info({ signUp, attempt }, "Successfully signed up user for event.");
          return signUp;
        }
      } catch (err) {
        // If there are no slots with remaining capacity, we add the user to the wait list.
        if (err instanceof NotFoundError) continue;
        throw err;
      }
    }

    /**
     * If we reach this point, we have tried to sign up the user 20 times, and failed every time.
     * Since the user hasn't been added to the wait list, there is likely still remaining capacity on the event,
     * but we have to abort at some point to avoid stalling the request.
     */
    this.logger?.error(
      "Failed to sign up user after 20 attempts. If this happens often, consider increasing the number of attempts."
    );
    throw new InternalServerError("Failed to sign up user after 20 attempts");
  }

  /**
   * get returns an event with the specified ID.
   *
   * @throws {NotFoundError} If an event with the specified ID does not exist
   * @param id - The ID of the event to get
   * @returns The event with the specified ID
   */
  async get(id: string): Promise<Event> {
    return await this.eventRepository.get(id);
  }

  /**
   * findMany returns all events.
   *
   * @params data.onlyFutureEvents - If true, only future events that have an `endAt` in the future will be returned
   * @returns All events
   */
  async findMany(data?: { onlyFutureEvents?: boolean }): Promise<Event[]> {
    if (!data) {
      return await this.eventRepository.findMany();
    }

    let endAtGte: Date | undefined;
    if (data.onlyFutureEvents) {
      endAtGte = new Date();
    }

    return await this.eventRepository.findMany({ endAtGte });
  }

  /**
   * promoteFromWaitList promotes the first available user on the wait list for the specified event to a confirmed sign up.
   *
   * @param eventId - The ID of the event to promote a user from the wait list for
   * @returns The confirmed sign up, or null if there are no users on the wait list, or if there is no remaining capacity
   * on the event, or no available slots for the users on the wait list.
   */
  async promoteFromWaitList(eventId: string): Promise<EventSignUp | null> {
    const event = await this.eventRepository.get(eventId);
    if (event.remainingCapacity === null) {
      throw new InvalidArgumentError("This event does does not have sign ups.");
    }

    if (event.remainingCapacity <= 0) {
      throw new InvalidArgumentError("This event is full.");
    }

    const signUpsOnWaitlist = await this.eventRepository.findManySignUps({
      eventId,
      status: ParticipationStatus.ON_WAITLIST,
    });
    for (const waitlistSignUp of signUpsOnWaitlist) {
      try {
        const slot = await this.eventRepository.getSlotWithRemainingCapacity(eventId);
        if (slot !== null) {
          const { signUp: confirmedSignUp } = await this.eventRepository.updateSignUp({
            userId: waitlistSignUp.userId,
            eventId,
            slotId: slot.id,
            newParticipationStatus: ParticipationStatus.CONFIRMED,
          });

          this.logger?.info({ confirmedSignUp }, "Promoted from waitlist to confirmed sign up.");
          return confirmedSignUp;
        }
      } catch (err) {
        if (err instanceof NotFoundError) continue;
        throw err;
      }
    }
    this.logger?.info({ eventId }, "Found no valid sign ups to promote from wait list");
    return null;
  }

  /**
   * demoteConfirmedSignUp demotes a confirmed sign up to one of the non-attending statuses, incrementing
   * the remaining capacity of the event and slot.
   *
   * @throws {InvalidArgumentError} If the sign up does not have status CONFIRMED
   * @throws {InternalServerError} If the sign up is missing a slot ID, but has status CONFIRMED
   * @throws {NotFoundError} If the sign up does not exist
   * @param data.signUpId - The ID of the sign up to demote
   * @param data.newParticipationStatus - The new participation status, must be one of the non-attending statuses
   * @returns The updated sign up
   */
  private async demoteConfirmedSignUp(data: {
    userId: string;
    eventId: string;
    newParticipationStatus: Extract<ParticipationStatus, "RETRACTED" | "REMOVED">;
  }): Promise<EventSignUp> {
    const { userId, eventId, newParticipationStatus } = data;

    const signUp = await this.eventRepository.getSignUp(userId, eventId);
    if (signUp.participationStatus !== ParticipationStatus.CONFIRMED) {
      throw new InvalidArgumentError(
        `Can only demote sign ups with status confirmed, got, {signUp.participationStatus}`
      );
    }

    if (signUp.slotId === null) {
      throw new InternalServerError("Sign up is missing slot ID, but has ParticipationStatus.CONFIRMED");
    }

    const { signUp: demotedSignUp } = await this.eventRepository.updateSignUp({
      newParticipationStatus,
      eventId: eventId,
      userId: userId,
    });
    return demotedSignUp;
  }

  private async demoteOnWaitlistSignUp(data: {
    userId: string;
    eventId: string;
    newParticipationStatus: Exclude<ParticipationStatus, "CONFIRMED" | "ON_WAITLIST">;
  }) {
    const { userId, eventId } = data;
    const signUp = await this.eventRepository.getSignUp(userId, eventId);
    if (signUp.participationStatus !== ParticipationStatus.ON_WAITLIST) {
      throw new InvalidArgumentError("Can only demote sign ups with with participation status ON_WAITLIST");
    }

    const { signUp: updatedSignUp } = await this.eventRepository.updateSignUp({
      userId,
      eventId,
      newParticipationStatus: data.newParticipationStatus,
    });
    return updatedSignUp;
  }

  /**
   * retractSignUp retracts a sign up, incrementing the remaining capacity of the event and slot
   * if the sign up was assigned to a slot.
   * This should be used when a user cancels their sign up.
   *
   * @param userId - The ID of the user that is retracting their sign up
   * @param eventId - The ID of the event to retract the sign up for
   * @returns The updated sign up
   */
  async retractSignUp(userId: string, eventId: string): Promise<EventSignUp> {
    const signUp = await this.eventRepository.getSignUp(userId, eventId);

    switch (signUp.participationStatus) {
      case ParticipationStatus.CONFIRMED:
        return await this.demoteConfirmedSignUp({
          userId,
          eventId,
          newParticipationStatus: ParticipationStatus.RETRACTED,
        });
      case ParticipationStatus.ON_WAITLIST:
        return await this.demoteOnWaitlistSignUp({
          userId,
          eventId,
          newParticipationStatus: ParticipationStatus.RETRACTED,
        });
      case ParticipationStatus.REMOVED:
      // fallthrough
      case ParticipationStatus.RETRACTED:
        return signUp;
    }
  }

  /**
   * removeSignUp removes a sign up, incrementing the remaining capacity of the event and slot
   * if the sign up was assigned to a slot.
   * This should be used when a user is removed from an event by an admin.
   */
  async removeSignUp(userId: string, eventId: string): Promise<EventSignUp> {
    const signUp = await this.eventRepository.getSignUp(userId, eventId);

    switch (signUp.participationStatus) {
      case ParticipationStatus.CONFIRMED:
        return await this.demoteConfirmedSignUp({
          userId,
          eventId,
          newParticipationStatus: ParticipationStatus.REMOVED,
        });
      case ParticipationStatus.ON_WAITLIST:
        return await this.demoteOnWaitlistSignUp({
          userId,
          eventId,
          newParticipationStatus: ParticipationStatus.REMOVED,
        });
      case ParticipationStatus.RETRACTED:
      // fallthrough
      case ParticipationStatus.REMOVED:
        return signUp;
    }
  }

  /**
   * canSignUpForEvent returns true if the user can sign up for the event, false otherwise.
   */
  async canSignUpForEvent(userId: string, eventId: string): Promise<boolean> {
    const event = await this.eventRepository.get(eventId);
    if (event.remainingCapacity === null) return false;

    if (event.remainingCapacity <= 0) return false;

    try {
      const signUp = await this.eventRepository.getSignUp(userId, eventId);
      if (signUp.active) return false;
    } catch (err) {
      const isNotFoundError = err instanceof NotFoundError;
      if (!isNotFoundError) throw err;
    }

    const slot = await this.eventRepository.getSlotWithRemainingCapacity(eventId);
    return slot !== null;
  }
}

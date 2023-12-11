import { Event, EventSignUp, EventSlot, ParticipationStatus } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import { merge } from "lodash-es";
import { DateTime } from "luxon";
import { z } from "zod";

import { InternalServerError, InvalidArgumentError, NotFoundError, PermissionDeniedError } from "@/domain/errors.js";
import { signUpAvailability } from "@/domain/events.js";
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

interface EventData {
  name: string;
  description?: string;
  startAt: Date;
  endAt: Date;
  organizationId: string;
  contactEmail?: string;
  location?: string;
}

interface SignUpDetails {
  capacity: number;
  slots: { capacity: number }[];
  signUpsStartAt: Date;
  signUpsEndAt: Date;
}

export interface EventRepository {
  create(event: EventData, signUpDetails?: SignUpDetails): Promise<Event>;
  update(id: string, event: Partial<EventData>, signUpDetails?: Partial<SignUpDetails>): Promise<Event>;
  get(id: string): Promise<Event>;
  getWithSlots(id: string): Promise<Event & { slots: EventSlot[] }>;
  getSlotWithRemainingCapacity(eventId: string, gradeYear?: number): Promise<EventSlot | null>;
  findMany(data?: { endAtGte?: Date | null }): Promise<Event[]>;
  findManySignUps(data: { eventId: string; status: ParticipationStatus }): Promise<EventSignUp[]>;
  getSignUp(userId: string, eventId: string): Promise<EventSignUp>;
  createSignUp(
    data: CreateConfirmedSignUpData | CreateOnWaitlistSignUpData
  ): Promise<{ signUp: EventSignUp; slot?: EventSlot; event: Event }>;
  updateSignUp(
    data: UpdateToConfirmedSignUpData | UpdateToInactiveSignUpData
  ): Promise<{ signUp: EventSignUp; slot?: EventSlot; event: Event }>;
  findManySlots(data: { gradeYear?: number; eventId: string }): Promise<EventSlot[]>;
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
    private userService: UserService,
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
   * @param signUps.capacity - The total number of sign ups allowed for the event
   * @param signUps.slots - The slots for the event
   * @param signUps.signUpsStartAt - The datetime when sign ups for the event open
   * @param signUps.signUpsEndAt - The datetime when sign ups for the event close
   * @returns The created event
   */
  async create(
    userId: string,
    organizationId: string,
    event: {
      name: string;
      description?: string | null;
      startAt: Date;
      endAt?: Date | null;
      location?: string | null;
      contactEmail?: string | null;
    },
    signUpDetails?: {
      signUpsEnabled: boolean;
      capacity: number;
      slots: { capacity: number; gradeYears?: number[] }[];
      signUpsStartAt: Date;
      signUpsEndAt: Date;
      gradeYears?: number[] | null;
    } | null
  ) {
    const isMember = await this.permissionService.hasRole({
      userId,
      organizationId,
      role: Role.MEMBER,
    });

    if (isMember !== true) {
      throw new PermissionDeniedError("You do not have permission to create an event for this organization.");
    }

    try {
      const validatedSignUpDetails = z
        .object({
          signUpsEnabled: z.boolean(),
          capacity: z.number().int().min(0),
          slots: z.array(
            z.object({
              capacity: z.number().int().min(0),
              gradeYears: z.array(z.number().int().min(1).max(5)).optional(),
            })
          ),
          signUpsStartAt: z.date(),
          signUpsEndAt: z.date().min(new Date()),
        })
        .optional()
        .transform((data) => data ?? undefined)
        .refine(
          (data) => {
            if (!data) return true;
            return data.signUpsEndAt > data.signUpsStartAt;
          },
          {
            message: "Sign ups end date must be after sign ups start date",
            path: ["signUpsEndAt"],
          }
        )
        .parse(signUpDetails);

      const {
        name,
        description,
        startAt,
        endAt = DateTime.fromJSDate(startAt).plus({ hours: 2 }).toJSDate(),
        location,
        contactEmail,
      } = z
        .object({
          name: z.string().min(1).max(100),
          description: z
            .string()
            .max(10_000)
            .optional()
            .transform((val) => val ?? undefined),
          startAt: z.date().min(new Date()),
          endAt: z
            .date()
            .min(new Date())
            .optional()
            .transform((val) => val ?? undefined),
          location: z
            .string()
            .max(100)
            .optional()
            .transform((val) => val ?? undefined),
          contactEmail: z
            .string()
            .email()
            .optional()
            .transform((val) => val ?? undefined),
        })
        .refine(
          (data) => {
            if (data.endAt === undefined) return true;
            return data.endAt > data.startAt;
          },
          {
            message: "End date must be after start date",
            path: ["endAt"],
          }
        )
        .parse(event);

      return await this.eventRepository.create(
        {
          name,
          description,
          startAt,
          endAt,
          location,
          contactEmail,
          organizationId,
        },
        validatedSignUpDetails
      );
    } catch (err) {
      if (err instanceof z.ZodError) throw new InvalidArgumentError(err.message);
      throw err;
    }
  }

  private validateUpdateSignUpDetails(
    data: Partial<SignUpDetails>,
    existingEvent: Event & { slots: EventSlot[] }
  ): SignUpDetails {
    const changingStartAt = data.signUpsStartAt !== undefined;
    const changingEndAt = data.signUpsEndAt !== undefined;

    const schema = z.object({
      signUpsEnabled: z.boolean(),
      capacity: z.number().int().min(0),
      slots: z.array(z.object({ capacity: z.number().int().min(0) })),
      signUpsStartAt: z.date(),
      signUpsEndAt: z.date(),
    });

    if (changingStartAt || changingEndAt) {
      return schema
        .extend({
          signUpsStartAt: z.date(),
          signUpsEndAt: z.date().min(new Date()),
        })
        .refine((data) => data.signUpsEndAt > data.signUpsStartAt, {
          message: "Sign ups end date must be after sign ups start date",
          path: ["signUpsEndAt"],
        })
        .parse(merge({}, existingEvent, data));
    }
    return schema.parse(merge({}, existingEvent, data));
  }

  private validateUpdateEventData(data: Partial<EventData>, existingEvent: Event): Partial<EventData> {
    const changingStartAt = data.startAt !== undefined;
    const changingEndAt = data.endAt !== undefined;
    const schema = z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(10_000).optional(),
      location: z.string().max(100).optional(),
      contactEmail: z.string().email().optional(),
    });

    if (changingStartAt || changingEndAt) {
      return schema
        .extend({
          startAt: z.date().min(new Date()),
          endAt: z.date().min(new Date()),
        })
        .refine((data) => data.endAt > data.startAt, {
          message: "End date must be after start date",
          path: ["endAt"],
        })
        .parse(merge({}, existingEvent, data));
    }
    return schema.parse(merge({}, existingEvent, data));
  }

  /**
   * update updates an event with the given data.
   * If capacity is changed, the remaining capacity of the event will be updated to reflect the change.
   *
   * @throws {InvalidCapacityError} if the new capacity is less than the number of confirmed sign ups
   * @param userId - The ID of the user that is updating the event
   * @param eventId - The ID of the event to update
   * @param data - The data to update the event with
   * @returns the updated event
   */
  async update(
    userId: string,
    eventId: string,
    data: {
      name?: string;
      description?: string;
      startAt?: Date;
      endAt?: Date;
      location?: string;
    },
    signUpDetails?: Partial<{
      signUpsEnabled: boolean;
      capacity: number;
      slots: { capacity: number }[];
      signUpsStartAt: Date;
      signUpsEndAt: Date;
    }>
  ): Promise<Event> {
    const event = await this.eventRepository.getWithSlots(eventId);
    if (!event.organizationId) {
      throw new InvalidArgumentError("Events that belong to deleted organizations cannot be updated.");
    }

    const isMember = await this.permissionService.hasRole({
      userId,
      organizationId: event.organizationId,
      role: Role.MEMBER,
    });

    if (isMember !== true) {
      throw new PermissionDeniedError("You do not have permission to update this event.");
    }
    try {
      let validatedSignUpDetails: SignUpDetails | undefined = undefined;
      if (signUpDetails) {
        validatedSignUpDetails = this.validateUpdateSignUpDetails(signUpDetails, event);
      }

      const validatedEvent: Partial<EventData> = this.validateUpdateEventData(data, event);
      return await this.eventRepository.update(eventId, validatedEvent, validatedSignUpDetails);
    } catch (err) {
      if (err instanceof z.ZodError) throw new InvalidArgumentError(err.message);
      throw err;
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
    const user = await this.userService.get(userId);

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
      if (!this.areSignUpsAvailable(event)) {
        throw new InvalidArgumentError("Cannot sign up for the event.");
      }

      // If there is no remaining capacity on the event, it doesn't matter if there is any remaining capacity in slots.
      if (event.remainingCapacity !== null && event.remainingCapacity <= 0) {
        this.logger?.info({ event }, "Event is full, adding user to wait list.");
        const { signUp } = await this.eventRepository.createSignUp({
          userId,
          participationStatus: ParticipationStatus.ON_WAITLIST,
          eventId,
        });
        return signUp;
      }

      try {
        const slotToSignUp = await this.eventRepository.getSlotWithRemainingCapacity(eventId, user.gradeYear);

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
    if (!event.signUpsEnabled) {
      throw new InvalidArgumentError("This event does does not have sign ups.");
    }

    if (!event.remainingCapacity || event.remainingCapacity <= 0) {
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

    if (!this.areSignUpsAvailable(event)) return false;
    if (!event.remainingCapacity || event.remainingCapacity <= 0) return false;

    try {
      const signUp = await this.eventRepository.getSignUp(userId, eventId);
      if (signUp.active) return false;
    } catch (err) {
      const isNotFoundError = err instanceof NotFoundError;
      if (!isNotFoundError) throw err;
    }

    const user = await this.userService.get(userId);
    const slot = await this.eventRepository.getSlotWithRemainingCapacity(eventId, user.gradeYear);
    return slot !== null;
  }

  /**
   * areSignUpsAvailable returns true if sign ups are available for the event, i.e.
   * if sign ups are enabled, and the current time is between the start and end date for sign ups.
   */
  private areSignUpsAvailable(event: Event): boolean {
    if (!event.signUpsEnabled) return false;
    if (!event.signUpsStartAt || event.signUpsStartAt > DateTime.now().toJSDate()) return false;
    if (!event.signUpsEndAt || event.signUpsEndAt < DateTime.now().toJSDate()) return false;
    return true;
  }

  async getSignUpAvailability(userId: string | undefined, eventId: string): Promise<keyof typeof signUpAvailability> {
    const event = await this.eventRepository.getWithSlots(eventId);
    if (!event.signUpsEnabled) return signUpAvailability.DISABLED;

    /**
     * User is not signed in
     */
    if (!userId) return signUpAvailability.UNAVAILABLE;
    const user = await this.userService.get(userId);

    try {
      const signUp = await this.eventRepository.getSignUp(user.id, eventId);
      if (signUp.participationStatus === ParticipationStatus.CONFIRMED) return signUpAvailability.CONFIRMED;
      if (signUp.participationStatus === ParticipationStatus.ON_WAITLIST) return signUpAvailability.ON_WAITLIST;
    } catch (err) {
      const isNotFoundError = err instanceof NotFoundError;
      if (!isNotFoundError) throw err;
    }

    const slots = await this.eventRepository.findManySlots({ gradeYear: user.gradeYear, eventId });
    /**
     * There are no slots on the event for this user's grade year, so they cannot sign up
     */
    if (slots.length === 0) return signUpAvailability.UNAVAILABLE;
    /**
     * Event sign ups have not opened yet
     */
    if (!event.signUpsStartAt || event.signUpsStartAt > DateTime.now().toJSDate()) return signUpAvailability.NOT_OPEN;
    /**
     * Event sign ups have closed
     */
    if (!event.signUpsEndAt || event.signUpsEndAt < DateTime.now().toJSDate()) return signUpAvailability.CLOSED;

    /**
     * The event is full
     */
    if (!event.remainingCapacity) return signUpAvailability.WAITLIST_AVAILABLE;

    const slotWithRemainingCapacity = await this.eventRepository.getSlotWithRemainingCapacity(eventId, user.gradeYear);
    /**
     * The slots for the user's grade year are full
     */
    if (slotWithRemainingCapacity === null) return signUpAvailability.WAITLIST_AVAILABLE;

    /**
     * The user can sign up for the event
     */
    return signUpAvailability.AVAILABLE;
  }
}

import { Event, EventSignUp, EventSlot } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import { merge } from "lodash-es";
import { z } from "zod";

import { InternalServerError, InvalidArgumentError, NotFoundError, PermissionDeniedError } from "@/domain/errors.js";
import { Role } from "@/domain/organizations.js";
import { User } from "@/domain/users.js";

export interface EventRepository {
  create(data: {
    name: string;
    description?: string;
    startAt: Date;
    endAt: Date;
    organizationId: string;
    organizerId: string;
    location?: string;
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
  createConfirmedSignUp(
    userId: string,
    event: { id: string; version: number },
    slot: { id: string; version: number }
  ): Promise<{ signUp: EventSignUp }>;
  createOnWaitlistSignUp(userId: string, event: { id: string }): Promise<EventSignUp>;
  getSlotWithAvailableSpots(eventId: string): Promise<EventSlot>;
}

export interface UserService {
  get(id: string): Promise<User>;
}

interface Logger extends FastifyBaseLogger {}

export interface OrganizationService {
  hasRole(data: { userId: string; organizationId: string; role: Role }): Promise<boolean>;
}

export class EventService {
  constructor(
    private eventRepository: EventRepository,
    private organizationService: OrganizationService,
    private logger?: Logger
  ) {}
  /**
   * Create a new event
   * @throws {InvalidArgumentError} - If any values are invalid
   * @param userId - The ID of the user that is creating the event, will also be the organizer of the event
   * @param organizationId - The ID of the organization that the event belongs to
   * @param data.name - The name of the event
   * @param data.description - The description of the event
   * @param data.startAt - The start datetime of the event, must be in the future
   * @param data.endAt - The end datetime of the event
   * @param data.location - The location of the event
   * @returns The created event
   */
  async create(
    userId: string,
    organizationId: string,
    data: { name: string; description?: string; startAt: Date; endAt?: Date; location?: string }
  ) {
    const schema = z
      .object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        startAt: z.date().min(new Date()),
        endAt: z.date().min(new Date()).optional(),
        location: z.string().max(100).optional(),
      })
      .refine((data) => (data.endAt ? data.startAt < data.endAt : true), {
        message: "End date must be after start date",
        path: ["endAt"],
      });

    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw new InvalidArgumentError(parsed.error.message);
    }

    const { name, description, startAt, location } = parsed.data;
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
      organizerId: userId,
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

    const isMember = await this.organizationService.hasRole({
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
   * Sign up a user for an event. If there are no available spots on the event, either because all avilable slots are
   * full, or because the event itself is full, the user will be added to the wait list.
   * This method will attempt a maximum of 20 times to sign up the user. If it fails, an InternalServerError is thrown.
   * If this happens, it is likely due to a high number of concurrent requests, and the user can try again.
   *
   * @throws {InvalidArgumentError} If the event does not have sign ups
   * @throws {InternalServerError} If the user could not be signed up after 20 attempts
   * @param userId - The ID of the user that is signing up
   * @param eventId - The ID of the event to sign up for
   * @returns The event sign up. If there are no available spots on the event, either because all avilable slots are
   * full, or because the event itself is full, the user will be added to the wait list. The returned sign up will
   * either have a status of `CONFIRMED` or `WAIT_LIST`.
   */
  async signUp(userId: string, eventId: string): Promise<EventSignUp> {
    const maxAttempts = 200;
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
      if (event.spots === null) {
        throw new InvalidArgumentError("This event does does not have sign ups.");
      }

      // If there are no spots left on the event, it doesn't matter if there are any spots left on the slots.
      if (event.spots <= 0) {
        this.logger?.info({ event }, "Event is full, adding user to wait list.");
        return await this.eventRepository.createOnWaitlistSignUp(userId, { id: event.id });
      }

      let slotToSignUp: EventSlot;
      try {
        slotToSignUp = await this.eventRepository.getSlotWithAvailableSpots(eventId);
      } catch (err) {
        // If there are no slots with available spots, we add the user to the wait list.
        if (err instanceof NotFoundError) {
          this.logger?.info({ event }, "Event is full, adding user to wait list.");
          return await this.eventRepository.createOnWaitlistSignUp(userId, { id: event.id });
        }
        throw err;
      }

      try {
        // Try to sign the user up for the event. If there have been changes, i.e. `version` does not match, a NotFoundError is thrown.
        // In that case, we refetch the event and slot, and try again.
        const { signUp } = await this.eventRepository.createConfirmedSignUp(userId, event, slotToSignUp);
        this.logger?.info({ signUp, attempt }, "Successfully signed up user for event.");
        return signUp;
      } catch (err) {
        if (!(err instanceof NotFoundError)) {
          throw err;
        }
      }
    }

    /**
     * If we reach this point, we have tried to sign up the user 20 times, and failed every time.
     * Since the user hasn't been added to the wait list, there are likely still spots left on the event,
     * but we have to abort at some point to avoid stalling the request.
     */
    this.logger?.error(
      "Failed to sign up user after 20 attempts. If this happens often, consider increasing the number of attempts."
    );
    throw new InternalServerError("Failed to sign up user after 20 attempts");
  }
}

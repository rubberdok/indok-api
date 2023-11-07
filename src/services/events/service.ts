import { Event } from "@prisma/client";
import { merge } from "lodash-es";
import { z } from "zod";

import { InvalidArgumentError, PermissionDeniedError } from "@/core/errors.js";
import { Role } from "@/domain/organizations.js";

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
  update(data: {
    name?: string;
    description?: string;
    startAt?: Date;
    endAt?: Date;
    location?: string;
  }): Promise<Event>;
  get(id: string): Promise<Event>;
}

export interface OrganizationService {
  hasRole(userId: string, organizationId: string, role: Role): Promise<boolean>;
}

export class EventService {
  constructor(
    private eventRepository: EventRepository,
    private organizationService: OrganizationService
  ) {}
  /**
   * Create a new event
   * @throws {InvalidArgumentError} - If any values are invalid
   * @param userId - The ID of the user that is creating the event, will also be the organizer of the event
   * @param organizationId - The ID of the organization that the event belongs to
   * @param data.name - The name of the event
   * @param data.description - The description of the event, @default ""
   * @param data.startAt - The start datetime of the event, must be in the future
   * @param data.endAt - The end datetime of the event, @default startAt + 2 hours, must be greater than `startAt`
   * @param data.location - The location of the event, @default ""
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

    const isMember = await this.organizationService.hasRole(userId, event.organizationId, Role.MEMBER);

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

      return await this.eventRepository.update(data);
    } else {
      throw new PermissionDeniedError("You do not have permission to update this event.");
    }
  }
}

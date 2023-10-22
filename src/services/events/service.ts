import { InvalidArgumentError } from "@/core/errors.js";
import { z } from "zod";

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
}

export class EventService {
  constructor(private eventRepository: EventRepository) {}

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
}

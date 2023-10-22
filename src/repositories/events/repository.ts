import { Database } from "@/core/interfaces.js";
import { Event } from "@prisma/client";

export class EventRepository {
  constructor(private db: Database) {}

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
}

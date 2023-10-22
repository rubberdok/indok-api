import { Organization, Role } from "@prisma/client";
import z from "zod";

import { Database } from "@/core/interfaces.js";

export class OrganizationRepository {
  constructor(private db: Database) {}

  async findMany(): Promise<Organization[]> {
    return this.db.organization.findMany();
  }

  async get(id: string): Promise<Organization | null> {
    return this.db.organization.findUnique({ where: { id } });
  }

  /**
   * Create a new organization, and add the given users as admins of the organization.
   */
  async create(data: { name: string; description?: string; userId: string }): Promise<Organization> {
    const { name, description, userId } = data;
    if (userId === "") throw new Error("userId cannot be empty");
    return this.db.organization.create({
      data: {
        name,
        description,
        members: {
          create: {
            userId,
            role: Role.ADMIN,
          },
        },
      },
    });
  }

  /**
   * Update an organization with the given name and description.
   * Passing undefined for a value will leave the value unchanged.
   *
   * @param data.id - The ID of the organization to update
   * @param data.name - Thew new name of the organization
   * @param data.description - The new description of the organization
   * @returns
   */
  async update(id: string, data: { name?: string; description?: string }): Promise<Organization> {
    const { name, description } = data;
    return this.db.organization.update({
      where: { id },
      data: {
        name,
        description,
      },
    });
  }
}

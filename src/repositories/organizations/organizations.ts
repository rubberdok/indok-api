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

  private validateOrganization(data: { name: string; description?: string }): void {
    const schema = z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(10000).optional(),
    });
    schema.parse(data);
  }

  /**
   * Create a new organization, and add the given users as admins of the organization.
   */
  async create(data: { name: string; description?: string; userId: string }): Promise<Organization> {
    const { name, description, userId } = data;
    this.validateOrganization(data);
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
}

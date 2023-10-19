import { Organization } from "@prisma/client";
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

  async create(data: { name: string; description?: string }): Promise<Organization> {
    this.validateOrganization(data);
    return this.db.organization.create({ data });
  }
}

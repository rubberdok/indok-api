import { Organization, Role } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";

import { InternalServerError, NotFoundError } from "@/core/errors.js";
import { Database } from "@/core/interfaces.js";

export class OrganizationRepository {
  constructor(private db: Database) {}

  async findMany(): Promise<Organization[]> {
    return this.db.organization.findMany();
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

  /**
   * Find an organization by ID, or throw an error if the organization does not exist.
   *
   * @throws {NotFoundError} - If the organization does not exist
   * @param id - The ID of the organization to fetch
   * @returns Organization
   */
  async get(id: string): Promise<Organization> {
    return this.db.organization.findUniqueOrThrow({ where: { id } }).catch((err) => {
      if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === "P2001") {
          throw new NotFoundError("The organization does not exist.");
        }
        throw err;
      }
      throw new InternalServerError(err.message);
    });
  }
}

import { Organization, Role } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";

import { InternalServerError, InvalidArgumentError, NotFoundError } from "@/core/errors.js";
import { Database } from "@/core/interfaces.js";

export class OrganizationRepository {
  constructor(private db: Database) {}

  async findMany(): Promise<Organization[]> {
    return this.db.organization.findMany();
  }

  /**
   * Create a new organization, and add the given users as admins of the organization.
   *
   * @throws {InvalidArgumentError} - If the organization name is already taken
   * @throws {InvalidArgumentError} - If the userId is the empty string
   * @param data.name - The name of the organization
   * @param data.description - The description of the organization
   * @param data.userId - The ID of the user to add as an admin of the organization
   * @returns The created organization
   */
  async create(data: { name: string; description?: string; userId: string }): Promise<Organization> {
    const { name, description, userId } = data;
    if (userId === "") throw new InvalidArgumentError("userId cannot be empty");
    return this.db.organization
      .create({
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
      })
      .catch((err) => {
        if (err instanceof PrismaClientKnownRequestError) {
          /**
           * "Unique constraint failed on the {constraint}"
           * https://www.prisma.io/docs/reference/api-reference/error-reference#p2002
           */
          if (err.code === "P2002") {
            throw new InvalidArgumentError("The organization name is already taken.");
          }
        }
        throw err;
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
        /**
         * "An operation failed because it depends on one or more records that were required but not found. {cause}"
         * https://www.prisma.io/docs/reference/api-reference/error-reference#p2025
         */
        if (err.code === "P2025") {
          throw new NotFoundError("The organization does not exist.");
        }
        throw err;
      }
      throw new InternalServerError(err.message);
    });
  }
}
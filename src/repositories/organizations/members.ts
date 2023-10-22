import { Member, Role } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";

import { InvalidArgumentError, NotFoundError } from "@/core/errors.js";
import { Database } from "@/core/interfaces.js";

export class MemberRepository {
  constructor(private db: Database) {}

  async findMany(where?: { organizationId?: string; userId?: string }): Promise<Member[]> {
    return this.db.member.findMany({
      where,
    });
  }

  async hasRole(data: { userId: string; organizationId: string; role: Role }): Promise<boolean> {
    return (
      this.db.member.findFirst({
        where: data,
      }) !== null
    );
  }

  /**
   * Get a membership by ID or by user and organization IDs.
   * If the data.id is given, the membership will be fetched by ID.
   * If the data.userId and data.organizationId is given, the membership will be fetched by the user and organization IDs.
   * @param data.id - The ID of the membership to fetch
   * @param data.userId - The ID of the user to fetch the membership for
   * @param data.organizationId - The ID of the organization to fetch the membership for
   * @returns Membership
   */
  async get(data: { id: string } | { userId: string; organizationId: string }): Promise<Member> {
    let promise: Promise<Member>;
    if ("id" in data) {
      promise = this.db.member.findUniqueOrThrow({ where: { id: data.id } });
    } else {
      promise = this.db.member.findUniqueOrThrow({
        where: { userId_organizationId: { userId: data.userId, organizationId: data.organizationId } },
      });
    }
    return promise.catch((err) => {
      if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === "P2001") {
          throw new NotFoundError("The membership does not exist.");
        }
      }
      throw err;
    });
  }

  /**
   * Create a new membership
   *
   * @throws InvalidArgumentError - If the data.userId is already a member of the organization
   * @param {string} data.userId - The ID of the user to add to the organization
   * @param {string} data.organizationId - The ID of the organization to add the user to
   * @param {Role} data.role - The role of the user in the organization, defaults to Role.MEMBER
   */
  async create(data: { userId: string; organizationId: string; role?: Role }): Promise<Member> {
    return this.db.member.create({ data }).catch((err) => {
      if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
          throw new InvalidArgumentError("The user is already a member of the organization.");
        }
      }
      throw err;
    });
  }

  /**
   * Remove a member from an organization
   *
   * If the data.id is given, the membership will be removed by ID.
   * If the data.userId and data.organizationId is given, the membership will be removed by the user and organization IDs.
   *
   * @param data.id - The ID of the membership to remove
   * @param data.userId - The ID of the user to remove from the organization
   * @param data.organizationId - The ID of the organization to remove the user from
   * @returns The removed membership
   */
  async remove(data: { id: string } | { userId: string; organizationId: string }): Promise<Member> {
    if ("id" in data) {
      return this.db.member.delete({ where: { id: data.id } });
    } else {
      const { userId, organizationId } = data;
      return this.db.member.delete({ where: { userId_organizationId: { userId, organizationId } } });
    }
  }
}

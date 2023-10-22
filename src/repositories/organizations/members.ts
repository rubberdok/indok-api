import { Member, Role } from "@prisma/client";

import { Database } from "@/core/interfaces.js";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";
import { InternalServerError, InvalidArgumentError } from "@/core/errors.js";

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

  async get(id: string): Promise<Member | null> {
    return this.db.member.findUnique({ where: { id } });
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
        throw new InvalidArgumentError(err.message);
      }
      throw new InternalServerError(err.message);
    });
  }
}

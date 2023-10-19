import { Member, Role } from "@prisma/client";

import { Database } from "@/core/interfaces.js";

export class MemberRepository {
  constructor(private db: Database) {}

  async findMany(where?: { organizationId?: string; userId?: string }): Promise<Member[]> {
    return this.db.member.findMany({
      where,
    });
  }

  async get(id: string): Promise<Member | null> {
    return this.db.member.findUnique({ where: { id } });
  }

  async create(data: { userId: string; organizationId: string; role?: Role }): Promise<Member> {
    return this.db.member.create({ data });
  }
}

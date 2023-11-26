import { Prisma, PrismaClient, User } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";

import { NotFoundError } from "@/domain/errors.js";
import { prismaKnownErrorCodes } from "@/lib/prisma.js";

export class UserRepository {
  constructor(private db: PrismaClient) {}

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.db.user.update({
      where: {
        id,
      },
      data,
    });
  }

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.db.user.create({
      data,
    });
  }

  getAll(): Promise<User[]> {
    return this.db.user.findMany();
  }

  async get(id: string): Promise<User> {
    try {
      return await this.db.user.findUniqueOrThrow({
        where: {
          id,
        },
      });
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === prismaKnownErrorCodes.ERR_NOT_FOUND) {
          const error = new NotFoundError(`User with id ${id} not found`);
          error.cause = err;
          throw error;
        }
      }
      throw err;
    }
  }

  getByFeideId(feideId: string): Promise<User> {
    return this.db.user.findFirstOrThrow({
      where: {
        feideId,
      },
    });
  }
}

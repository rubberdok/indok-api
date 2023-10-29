import { Prisma, User } from "@prisma/client";
import dayjs from "dayjs";

import { createUserSchema, updateUserSchema } from "./validation.js";

export interface UserRepository {
  get(id: string): Promise<User>;
  getAll(): Promise<User[]>;
  getByFeideId(feideId: string): Promise<User>;
  update(id: string, data: Prisma.UserUpdateInput): Promise<User>;
  create(data: Prisma.UserCreateInput): Promise<User>;
}

export class UserService {
  constructor(private usersRepository: UserRepository) {}

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    updateUserSchema.parse(data);

    const user = await this.usersRepository.get(id);

    if (user.firstLogin) {
      data = { ...data, firstLogin: false };
    } else if (!this.canUpdateYear(user)) {
      data = { ...data, graduationYear: undefined };
    } else if (data.graduationYear && data.graduationYear !== user.graduationYear) {
      data = { ...data, graduationYearUpdatedAt: new Date() };
    }

    return this.usersRepository.update(id, data);
  }

  canUpdateYear(user: User): boolean {
    return (
      user.graduationYearUpdatedAt === null || dayjs(user.graduationYearUpdatedAt).add(1, "year").isBefore(dayjs())
    );
  }

  login(id: string): Promise<User> {
    return this.usersRepository.update(id, { lastLogin: new Date() });
  }

  create(data: Prisma.UserCreateInput): Promise<User> {
    this.validateUser(data);
    return this.usersRepository.create(data);
  }

  async getByFeideID(feideId: string): Promise<User | null> {
    try {
      return await this.usersRepository.getByFeideId(feideId);
    } catch (err) {
      return null;
    }
  }

  private validateUser(user: Prisma.UserCreateInput): void {
    createUserSchema.parse(user);
  }

  get(id: string): Promise<User> {
    return this.usersRepository.get(id);
  }
  getAll(): Promise<User[]> {
    return this.usersRepository.getAll();
  }
}

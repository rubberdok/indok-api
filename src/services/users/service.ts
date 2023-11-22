import { Prisma, User as PrismaUser } from "@prisma/client";
import { merge } from "lodash-es";
import { DateTime } from "luxon";

import { InvalidArgumentError } from "@/domain/errors.js";
import { User } from "@/domain/users.js";

import { createUserSchema, updateUserSchema } from "./validation.js";

export interface UserRepository {
  get(id: string): Promise<PrismaUser>;
  getAll(): Promise<PrismaUser[]>;
  getByFeideId(feideId: string): Promise<PrismaUser>;
  update(id: string, data: Prisma.UserUpdateInput): Promise<PrismaUser>;
  create(data: Prisma.UserCreateInput): Promise<PrismaUser>;
}

export class UserService {
  constructor(private usersRepository: UserRepository) {}

  /**
   * update - Updates a user with the given data. If this user has not logged in before, the firstLogin flag will be set to false.
   * If the user cannot update graduation year yet, the graduationYear will be set to null.
   *
   * @param id - The id of the user to update
   * @param data - The data to update the user with
   * @returns
   */
  async update(
    id: string,
    data: Partial<{
      firstName: string | null;
      lastName: string | null;
      graduationYear: number | null;
      allergies: string | null;
      phoneNumber: string | null;
    }>
  ): Promise<User> {
    const parsed = updateUserSchema.safeParse(data);
    if (parsed.success) {
      const { data: validatedData } = parsed;
      const user = await this.usersRepository.get(id);

      let additionalData: {
        firstLogin?: boolean;
        graduationYearUpdatedAt?: Date;
        graduationYear?: number;
      } = {};

      if (user.firstLogin) {
        additionalData = { ...additionalData, firstLogin: false };
      } else if (!this.canUpdateYear(user)) {
        additionalData = { ...additionalData, graduationYear: undefined };
      } else if (data.graduationYear && data.graduationYear !== user.graduationYear) {
        additionalData = { ...additionalData, graduationYearUpdatedAt: new Date() };
      }

      const updatedUser = await this.usersRepository.update(id, { ...validatedData, ...additionalData });
      return this.toDomainUser(updatedUser);
    } else {
      throw new InvalidArgumentError(parsed.error.message);
    }
  }

  canUpdateYear(user: Pick<User, "graduationYearUpdatedAt">): boolean {
    return (
      user.graduationYearUpdatedAt === null ||
      DateTime.fromJSDate(user.graduationYearUpdatedAt).plus({ years: 1 }) < DateTime.now()
    );
  }

  async login(id: string): Promise<User> {
    const user = await this.usersRepository.update(id, { lastLogin: new Date() });
    return this.toDomainUser(user);
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    this.validateUser(data);
    const user = await this.usersRepository.create(data);
    return this.toDomainUser(user);
  }

  async getByFeideID(feideId: string): Promise<User | null> {
    try {
      const user = await this.usersRepository.getByFeideId(feideId);
      return this.toDomainUser(user);
    } catch (err) {
      return null;
    }
  }

  private validateUser(user: Prisma.UserCreateInput): void {
    createUserSchema.parse(user);
  }

  async get(id: string): Promise<User> {
    const user = await this.usersRepository.get(id);
    return this.toDomainUser(user);
  }
  async getAll(): Promise<User[]> {
    const users = await this.usersRepository.getAll();
    return users.map((user) => this.toDomainUser(user));
  }

  toDomainUser(user: PrismaUser): User {
    const canUpdateYear = this.canUpdateYear(user);

    if (!user.graduationYear) {
      return merge({}, user, { gradeYear: undefined, canUpdateYear });
    }
    /**
     * Grade year should be between 1 and 6,
     * and is calculated based on the graduation year.
     * Since the semester starts in August, we increment the grade year
     * from the start of august.
     *
     * Example:
     * | Current Date | Graduation Year | Grade Year |
     * -----------------------------------------------
     * | 2021-01-01   | 2021            | 5          |
     * | 2021-08-01   | 2021            | 6          |
     * | 2021-08-01   | 2026            | 1          |
     * | 2022-01-01   | 2026            | 1          |
     * | 2022-08-01   | 2026            | 2          |
     */

    const now = DateTime.now();
    const graduationYear = user.graduationYear;
    const gradeYear = 5 - (graduationYear - now.year);
    const offset = now.month >= 7 ? 1 : 0;

    return merge({}, user, { gradeYear: gradeYear + offset, canUpdateYear });
  }
}

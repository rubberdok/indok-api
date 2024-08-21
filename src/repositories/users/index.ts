import type { Prisma, PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";
import {
	InternalServerError,
	InvalidArgumentError,
	NotFoundError,
} from "~/domain/errors.js";
import { StudyProgram, User } from "~/domain/users.js";
import type { Context } from "~/lib/context.js";
import { prismaKnownErrorCodes } from "~/lib/prisma.js";
import { Result, type ResultAsync } from "~/lib/result.js";
import type { UserRepository as IUserRepository } from "~/services/users/index.js";

export class UserRepository implements IUserRepository {
	constructor(private db: PrismaClient) {}

	async update(id: string, data: Partial<User>): Promise<User> {
		const { enrolledStudyPrograms, ...rest } = data;
		const user = await this.db.user.update({
			where: {
				id,
			},
			data: {
				...rest,
				enrolledStudyPrograms: {
					set: enrolledStudyPrograms?.map((studyProgram) => ({
						id: studyProgram.id,
					})),
				},
			},
		});
		return new User(user);
	}

	async create(data: Prisma.UserCreateInput): Promise<User> {
		const user = await this.db.user.create({
			data,
		});
		return new User(user);
	}

	async getAll(): Promise<User[]> {
		const users = await this.db.user.findMany();
		return users.map((user) => new User(user));
	}

	async get(id: string): Promise<User> {
		try {
			const user = await this.db.user.findUniqueOrThrow({
				where: {
					id,
				},
			});
			return new User(user);
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

	async getByFeideId(feideId: string): Promise<User> {
		const user = await this.db.user.findUniqueOrThrow({
			where: {
				feideId,
			},
		});
		return new User(user);
	}

	/**
	 * createStudyProgram creates a new study program if it does not exist.
	 *
	 * @throws {InvalidArgumentError} if a study program with the same external id or name already exists.
	 */
	async createStudyProgram(studyProgram: {
		name: string;
		externalId: string;
	}): Promise<StudyProgram> {
		try {
			const createdStudyProgram = await this.db.studyProgram.create({
				data: studyProgram,
			});
			return new StudyProgram(createdStudyProgram);
		} catch (err) {
			if (err instanceof PrismaClientKnownRequestError) {
				if (
					err.code === prismaKnownErrorCodes.ERR_UNIQUE_CONSTRAINT_VIOLATION
				) {
					const error = new InvalidArgumentError(
						`Study program with external id ${studyProgram.externalId} or name ${studyProgram.name} already exists`,
					);
					error.cause = err;
					throw error;
				}
			}
			throw err;
		}
	}

	/**
	 * getStudyProgram returns a study program by id or external id.
	 * @param by.id - The internal id of the study program
	 * @param by.externalId - The external id of the study program
	 * @returns The study program or null if it does not exist
	 */
	async getStudyProgram(
		by: { id: string } | { externalId: string },
	): Promise<StudyProgram | null> {
		const studyProgram = await this.db.studyProgram.findUnique({
			where: by,
		});
		if (!studyProgram) {
			return null;
		}
		return new StudyProgram(studyProgram);
	}

	async findManyStudyPrograms(
		ctx: Context,
		by: { userId: string },
	): ResultAsync<{ studyPrograms: StudyProgram[] }, InternalServerError> {
		ctx.log.info({ userId: by.userId }, "Finding study programs for user");
		try {
			const studyPrograms = await this.db.studyProgram.findMany({
				where: {
					usersEnrolledInProgram: {
						some: {
							id: by.userId,
						},
					},
				},
			});

			return Result.success({
				studyPrograms: studyPrograms.map(
					(studyProgram) => new StudyProgram(studyProgram),
				),
			});
		} catch (err) {
			return Result.error(
				new InternalServerError("Failed to find study programs", err),
			);
		}
	}
}

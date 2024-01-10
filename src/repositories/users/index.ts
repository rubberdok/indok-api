import type { Prisma, PrismaClient, User } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";
import { InvalidArgumentError, NotFoundError } from "~/domain/errors.js";
import type { StudyProgram, User as DomainUser } from "~/domain/users.js";
import { prismaKnownErrorCodes } from "~/lib/prisma.js";

export class UserRepository {
	constructor(private db: PrismaClient) {}

	update(id: string, data: Partial<DomainUser>): Promise<User> {
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
			return createdStudyProgram;
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
	getStudyProgram(
		by: { id: string } | { externalId: string },
	): Promise<StudyProgram | null> {
		return this.db.studyProgram.findUnique({
			where: by,
		});
	}
}

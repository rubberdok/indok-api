import type { Prisma, PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";
import { InvalidArgumentError, NotFoundError } from "~/domain/errors.js";
import {
	type StudyProgram,
	type User,
	newUserFromDSO,
} from "~/domain/users.js";
import { prismaKnownErrorCodes } from "~/lib/prisma.js";

export class UserRepository {
	constructor(private db: PrismaClient) {}

	async update(id: string, data: Partial<User>): Promise<User> {
		const user = await this.db.user.update({
			where: {
				id,
			},
			data,
		});
		return newUserFromDSO(user);
	}

	async create(data: Prisma.UserCreateInput): Promise<User> {
		const user = await this.db.user.create({
			data,
		});
		return newUserFromDSO(user);
	}

	async getAll(): Promise<User[]> {
		const users = await this.db.user.findMany();
		return users.map(newUserFromDSO);
	}

	async get(id: string): Promise<User> {
		try {
			const user = await this.db.user.findUniqueOrThrow({
				where: {
					id,
				},
			});
			return newUserFromDSO(user);
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
		return newUserFromDSO(user);
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

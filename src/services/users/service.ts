import type { Prisma, User as PrismaUser } from "@prisma/client";
import { merge } from "lodash-es";
import { DateTime } from "luxon";
import { z } from "zod";
import {
	InvalidArgumentError,
	PermissionDeniedError,
} from "~/domain/errors.js";
import {
	type StudyProgram,
	type User,
	newStudyProgram,
} from "~/domain/users.js";
import type { Context } from "../context.js";
import type { MailQueue } from "../mail/worker.js";
import { createUserSchema } from "./validation.js";

export interface UserRepository {
	get(id: string): Promise<PrismaUser>;
	getAll(): Promise<PrismaUser[]>;
	getByFeideId(feideId: string): Promise<PrismaUser>;
	update(id: string, user: Partial<User>): Promise<PrismaUser>;
	create(data: Prisma.UserCreateInput): Promise<PrismaUser>;
	createStudyProgram(studyProgram: {
		name: string;
		externalId: string;
	}): Promise<StudyProgram>;
	getStudyProgram(
		by: { id: string } | { externalId: string },
	): Promise<StudyProgram | null>;
}

export interface PermissionService {
	isSuperUser(userId: string | undefined): Promise<{ isSuperUser: boolean }>;
}

export class UserService {
	constructor(
		private usersRepository: UserRepository,
		private permissionService: PermissionService,
		private emailQueue: MailQueue,
	) {}

	/**
	 * superUpdateUser - Updates a user with the given data. This method can only be called by a super user.
	 *
	 * @throws PermissionDeniedError - If the caller is not a super user
	 * @param ctx - The context of the request
	 * @param userId - The id of the user to update
	 * @param data - The data to update the user with
	 */
	async superUpdateUser(
		ctx: Context,
		userId: string,
		data: Partial<{
			firstName: string | null;
			lastName: string | null;
			graduationYear: number | null;
			allergies: string | null;
			phoneNumber: string | null;
			isSuperUser?: boolean | null;
			studyProgramId?: string | null;
		}>,
	): Promise<User> {
		const { isSuperUser } = await this.permissionService.isSuperUser(
			ctx.user?.id,
		);
		if (isSuperUser !== true)
			throw new PermissionDeniedError(
				"You do not have permission to update this user",
			);

		ctx.log.info({ updatingUser: userId }, "super update user");
		const schema = z.object({
			firstName: z
				.string()
				.min(2)
				.nullish()
				.transform((val) => val ?? undefined),
			lastName: z
				.string()
				.min(2)
				.nullish()
				.transform((val) => val ?? undefined),
			email: z
				.string()
				.email({ message: "invalid email" })
				.nullish()
				.transform((val) => val ?? undefined),
			graduationYear: z
				.number()
				.min(DateTime.now().year)
				.nullish()
				.transform((val) => val ?? undefined),
			allergies: z
				.string()
				.nullish()
				.transform((val) => val ?? undefined),
			phoneNumber: z
				.string()
				.regex(/^(0047|\+47|47)?[49]\d{7}$/)
				.nullish()
				.transform((val) => val ?? undefined),
			isSuperUser: z
				.boolean()
				.nullish()
				.transform((val) => val ?? undefined),
			studyProgramId: z
				.string()
				.uuid()
				.nullish()
				.transform((val) => val ?? undefined),
		});
		const validatedData = schema.parse(data);

		const user = await this.usersRepository.update(userId, validatedData);
		return this.toDomainUser(user);
	}

	/**
	 * update - Updates a user with the given data. If this user has not logged in before, the firstLogin flag will be set to false.
	 * If the user cannot update graduation year yet, the graduationYear will be set to null.
	 *
	 * @param callerUserId - The id of the user making the request
	 * @param userToUpdateId - The id of the user to update
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
			studyProgramId: string | null;
		}>,
	): Promise<User> {
		const schema = z.object({
			firstName: z
				.string()
				.min(2)
				.nullish()
				.transform((val) => val ?? undefined),
			lastName: z
				.string()
				.min(2)
				.nullish()
				.transform((val) => val ?? undefined),
			email: z
				.string()
				.email({ message: "invalid email" })
				.nullish()
				.transform((val) => val ?? undefined),
			graduationYear: z
				.number()
				.min(DateTime.now().year)
				.nullish()
				.transform((val) => val ?? undefined),
			allergies: z
				.string()
				.nullish()
				.transform((val) => val ?? undefined),
			studyProgramId: z
				.string()
				.nullish()
				.transform((val) => val ?? undefined),
			phoneNumber: z
				.string()
				.regex(/^(0047|\+47|47)?[49]\d{7}$/)
				.nullish()
				.transform((val) => val ?? undefined)
				.or(
					z
						.string()
						.nullish()
						.transform((val) => val ?? undefined),
				),
		});
		try {
			const user = await this.usersRepository.get(id);

			const {
				firstName,
				lastName,
				email,
				phoneNumber,
				allergies,
				graduationYear,
				studyProgramId,
			} = schema.parse(data);
			let firstLogin: boolean | undefined;
			let newGraduationYear: number | undefined = graduationYear;
			let graduationYearUpdatedAt: Date | undefined = undefined;

			if (user.firstLogin) firstLogin = false;
			else if (!this.canUpdateYear(user)) newGraduationYear = undefined;
			else if (graduationYear && graduationYear !== user.graduationYear)
				graduationYearUpdatedAt = new Date();

			const updatedUser = await this.usersRepository.update(id, {
				firstName,
				lastName,
				email,
				phoneNumber,
				allergies,
				graduationYear: newGraduationYear,
				graduationYearUpdatedAt,
				firstLogin,
				studyProgramId,
			});

			return this.toDomainUser(updatedUser);
		} catch (err) {
			if (err instanceof z.ZodError)
				throw new InvalidArgumentError(err.message);
			throw err;
		}
	}

	canUpdateYear(user: Pick<User, "graduationYearUpdatedAt">): boolean {
		return (
			user.graduationYearUpdatedAt === null ||
			DateTime.fromJSDate(user.graduationYearUpdatedAt).plus({ years: 1 }) <
				DateTime.now()
		);
	}

	async login(id: string): Promise<User> {
		const user = await this.usersRepository.update(id, {
			lastLogin: new Date(),
		});
		return this.toDomainUser(user);
	}

	async create(data: Prisma.UserCreateInput): Promise<User> {
		this.validateUser(data);
		const user = await this.usersRepository.create(data);
		await this.emailQueue.add("welcome", {
			recipientId: user.id,
		});
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

	/**
	 * createStudyProgram creates a new study program if it does not exist.
	 */
	async createStudyProgram(data: {
		name: string;
		externalId: string;
	}): Promise<StudyProgram> {
		const studyProgram = newStudyProgram(data);
		return await this.usersRepository.createStudyProgram(studyProgram);
	}

	/**
	 * getStudyProgram returns a study program by id or external id.
	 */
	getStudyProgram(
		by: { id: string } | { externalId: string },
	): Promise<StudyProgram | null> {
		return this.usersRepository.getStudyProgram(by);
	}
}

import type { User as PrismaUser } from "@prisma/client";
import { merge } from "lodash-es";
import { DateTime } from "luxon";
import { z } from "zod";
import { InvalidArgumentError } from "./errors.js";

export interface User extends PrismaUser {
	gradeYear?: number;
	canUpdateYear: boolean;
}

export type StudyProgram = {
	id: string;
	name: string;
	externalId: string;
	featurePermissions: string[];
};

export function newStudyProgram(studyProgram: {
	name: string;
	externalId: string;
}): Omit<StudyProgram, "id"> {
	const schema = z.object({
		name: z.string().min(2),
		externalId: z.string(),
	});
	try {
		const { name, externalId } = schema.parse(studyProgram);
		return {
			name,
			externalId,
			featurePermissions: [],
		};
	} catch (err) {
		if (err instanceof z.ZodError) {
			throw new InvalidArgumentError(err.message);
		}
		throw err;
	}
}

function canUpdateYear(user: Pick<User, "graduationYearUpdatedAt">): boolean {
	return (
		user.graduationYearUpdatedAt === null ||
		DateTime.fromJSDate(user.graduationYearUpdatedAt).plus({ years: 1 }) <
			DateTime.now()
	);
}

function newUserFromDSO(user: PrismaUser): User {
	const canUserUpdateYear = canUpdateYear(user);

	if (!user.graduationYear) {
		return merge({}, user, {
			gradeYear: undefined,
			canUpdateYear: canUserUpdateYear,
		});
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

	return merge({}, user, {
		gradeYear: gradeYear + offset,
		canUpdateYear: canUserUpdateYear,
	});
}

export { newUserFromDSO };

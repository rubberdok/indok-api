import type { User as PrismaUser } from "@prisma/client";
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

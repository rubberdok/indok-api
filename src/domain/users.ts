import type { User as PrismaUser } from "@prisma/client";

export interface User extends PrismaUser {
	gradeYear?: number;
	canUpdateYear: boolean;
}

export type StudyProgram = {
	id: string;
	name: string;
};

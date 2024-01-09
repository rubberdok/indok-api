import type { User as PrismaUser } from "@prisma/client";

export interface User extends PrismaUser {
	gradeYear?: number;
	canUpdateYear: boolean;
}

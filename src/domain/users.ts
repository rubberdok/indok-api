import { isNil } from "lodash-es";
import { DateTime } from "luxon";
import type { FeaturePermissionType } from "./organizations.js";

class StudyProgram {
	id: string;
	name: string;
	externalId: string;
	featurePermissions: FeaturePermissionType[];

	constructor(params: StudyProgram) {
		this.id = params.id;
		this.name = params.name;
		this.externalId = params.externalId;
		this.featurePermissions = params.featurePermissions;
	}
}

interface IUser {
	id: string;
	feideId: string;
	createdAt: Date;
	updatedAt: Date;
	lastLogin: Date;
	firstLogin: boolean;
	firstName: string;
	lastName: string;
	email: string;
	username: string;
	graduationYear: number | null;
	graduationYearUpdatedAt: Date | null;
	allergies: string;
	phoneNumber: string;
	isSuperUser: boolean;
	confirmedStudyProgramId: string | null;
	enrolledStudyPrograms?: StudyProgram[] | null;
	fullName: string;
	canUpdateYear: boolean;
	gradeYear: number | undefined;
}

class User implements IUser {
	id: string;
	feideId: string;
	createdAt: Date;
	updatedAt: Date;
	lastLogin: Date;
	firstLogin: boolean;
	firstName: string;
	lastName: string;
	email: string;
	username: string;
	graduationYear: number | null;
	graduationYearUpdatedAt: Date | null;
	allergies: string;
	phoneNumber: string;
	isSuperUser: boolean;
	confirmedStudyProgramId: string | null;
	enrolledStudyPrograms?: StudyProgram[] | null;

	constructor(params: Omit<IUser, "fullName" | "canUpdateYear" | "gradeYear">) {
		this.id = params.id;
		this.feideId = params.feideId;
		this.createdAt = params.createdAt;
		this.updatedAt = params.updatedAt;
		this.lastLogin = params.lastLogin;
		this.firstLogin = params.firstLogin;
		this.firstName = params.firstName;
		this.lastName = params.lastName;
		this.email = params.email;
		this.username = params.username;
		this.graduationYear = params.graduationYear;
		this.graduationYearUpdatedAt = params.graduationYearUpdatedAt;
		this.allergies = params.allergies;
		this.phoneNumber = params.phoneNumber;
		this.isSuperUser = params.isSuperUser;
		this.confirmedStudyProgramId = params.confirmedStudyProgramId;
		this.enrolledStudyPrograms = params.enrolledStudyPrograms;
	}

	public toJSON(): IUser {
		return {
			id: this.id,
			feideId: this.feideId,
			createdAt: this.createdAt,
			updatedAt: this.updatedAt,
			lastLogin: this.lastLogin,
			firstLogin: this.firstLogin,
			firstName: this.firstName,
			lastName: this.lastName,
			email: this.email,
			username: this.username,
			graduationYear: this.graduationYear,
			graduationYearUpdatedAt: this.graduationYearUpdatedAt,
			allergies: this.allergies,
			phoneNumber: this.phoneNumber,
			isSuperUser: this.isSuperUser,
			confirmedStudyProgramId: this.confirmedStudyProgramId,
			enrolledStudyPrograms: this.enrolledStudyPrograms,
			canUpdateYear: this.canUpdateYear,
			gradeYear: this.gradeYear,
			fullName: this.fullName,
		};
	}

	get fullName(): string {
		return `${this.firstName} ${this.lastName}`;
	}

	get canUpdateYear(): boolean {
		return (
			isNil(this.graduationYearUpdatedAt) ||
			DateTime.fromJSDate(this.graduationYearUpdatedAt).plus({ years: 1 }) <
				DateTime.now()
		);
	}

	get gradeYear(): number | undefined {
		if (!this.graduationYear) return undefined;

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
		const graduationYear = this.graduationYear;
		const gradeYear = 5 - (graduationYear - now.year);
		const offset = now.month >= 7 ? 1 : 0;
		return gradeYear + offset;
	}
}

export { StudyProgram, User };
export type { IUser };

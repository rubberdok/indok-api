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

class User {
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

	constructor(params: Omit<User, "fullName" | "canUpdateYear" | "gradeYear">) {
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

export { User, StudyProgram };

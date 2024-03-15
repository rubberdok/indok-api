import type { User } from "~/domain/users.js";

type UsersResponseMapper = { users: User[] };

export type { StudyProgram as StudyProgramMapper } from "~/domain/users.js";

export type {
	UsersResponseMapper,
	User as PrivateUserMapper,
	User as PublicUserMapper,
};

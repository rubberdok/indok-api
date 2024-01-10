import type { StudyProgram, User } from "~/domain/users.js";

export type PrivateUserMapper = User;
export type PublicUserMapper = User;

export type UsersResponseMapper = { users: User[] };
export type StudyProgramMapper = StudyProgram;

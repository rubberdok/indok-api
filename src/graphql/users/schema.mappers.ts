import type { User } from "~/domain/users.js";

export type PrivateUserMapper = User;
export type PublicUserMapper = User;

export type UsersResponseMapper = { users: User[] };

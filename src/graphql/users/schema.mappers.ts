import { User } from "@prisma/client";

export type UserMapper = User;

export type UsersResponseMapper = { users: User[] };

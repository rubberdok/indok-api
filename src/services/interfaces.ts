import { Prisma, User } from "@prisma/client";

export { ICabinService } from "./cabins/interfaces.js";
export { IMailService } from "./mail/interfaces.js";

export interface IUserService {
  update(id: string, data: Prisma.UserUpdateInput): Promise<User>;
  login(id: string): Promise<User>;
  get(id: string): Promise<User>;
  getAll(): Promise<User[]>;
  getByFeideID(feideId: string): Promise<User | null>;
  create(data: Prisma.UserCreateInput): Promise<User>;
  canUpdateYear(user: User): boolean;
}

export interface GetUserParams {
  code: string;
  codeVerifier: string;
}

export interface IAuthService {
  getUser(data: GetUserParams): Promise<User>;
  ssoUrl(state?: string | null): {
    url: string;
    codeChallenge: string;
    codeVerifier: string;
  };
}

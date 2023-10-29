import { User } from "@prisma/client";

export { ICabinService } from "./cabins/interfaces.js";
export { IMailService } from "./mail/interfaces.js";

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

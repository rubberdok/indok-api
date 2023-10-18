import crypto from "crypto";

import { User } from "@prisma/client";

import { env } from "@/config.js";
import { GetUserParams, IAuthService } from "@/services/interfaces.js";

const FeideProvider = {
  baseUrl: env.FEIDE_BASE_URL,
  token: "/oauth/token",
  authorization: "/oauth/authorization",
  redirectURL: env.FEIDE_REDIRECT_URI,
  clientID: env.FEIDE_CLIENT_ID,
  userInfo: "/openid/userinfo",
};

interface UserService {
  create(data: {
    email: string;
    firstName: string;
    lastName: string;
    feideId: string;
    username: string;
  }): Promise<User>;
  login(id: string): Promise<User>;
  getByFeideID(feideId: string): Promise<User | null>;
}

interface OAuthClient {
  fetchUserInfo(params: { url: string; accessToken: string }): Promise<UserInfo>;
  fetchAccessToken(params: { url: string; body: URLSearchParams; authorization: string }): Promise<string>;
}

interface UserInfo {
  sub: string;
  name: string;
  "dataporten-userid_sec": string[];
  email: string;
}

export class FeideService implements IAuthService {
  constructor(
    private userService: UserService,
    private oauthClient: OAuthClient
  ) {}

  private scope = ["openid", "userid", "userid-feide", "userinfo-name", "userinfo-photo", "email", "groups-edu"].join(
    " "
  );

  ssoUrl(state?: string | null): {
    url: string;
    codeChallenge: string;
    codeVerifier: string;
  } {
    const { codeVerifier, codeChallenge } = this.pkce();

    const url = new URL(FeideProvider.authorization, FeideProvider.baseUrl);
    const searchParams = new URLSearchParams({
      client_id: FeideProvider.clientID,
      scope: this.scope,
      response_type: "code",
      code_challenge_method: "S256",
      code_challenge: codeChallenge,
      redirect_uri: FeideProvider.redirectURL,
      ...(state ? { state } : {}),
    });

    url.search = searchParams.toString();

    return {
      url: url.toString(),
      codeVerifier,
      codeChallenge,
    };
  }

  async getUser({ code, codeVerifier }: GetUserParams): Promise<User> {
    const accessToken = await this.getAccessToken(code, codeVerifier);
    const userInfo = await this.getUserInfo(accessToken);
    const { email, sub: feideId, name } = userInfo;

    const user = await this.userService.getByFeideID(feideId);
    if (!user) {
      const [firstName, lastName] = name.split(" ");
      const userId = userInfo["dataporten-userid_sec"].find((id) => id.endsWith("@ntnu.no")) ?? userInfo.email;
      const username = userId.slice(userId.indexOf(":") + 1, userId.indexOf("@"));

      return this.userService.create({
        email,
        firstName: firstName ?? "",
        lastName: lastName ?? "",
        feideId,
        username,
      });
    } else {
      return this.userService.login(user.id);
    }
  }

  private async getUserInfo(accessToken: string): Promise<UserInfo> {
    const url = new URL(FeideProvider.userInfo, FeideProvider.baseUrl).toString();

    return await this.oauthClient.fetchUserInfo({ url, accessToken });
  }

  private async getAccessToken(code: string, codeVerifier: string): Promise<string> {
    const url = new URL(FeideProvider.token, FeideProvider.baseUrl).toString();

    // https://en.wikipedia.org/wiki/Basic_access_authentication
    const authorization =
      "Basic " + Buffer.from(`${env.FEIDE_CLIENT_ID}:${env.FEIDE_CLIENT_SECRET}`).toString("base64url");

    const data = {
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
      code,
      redirect_uri: FeideProvider.redirectURL,
      client_id: FeideProvider.clientID,
    };

    const body = new URLSearchParams(data);

    return await this.oauthClient.fetchAccessToken({ url, body, authorization });
  }

  private pkce(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = crypto.randomBytes(32).toString("base64url");
    const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");

    return { codeVerifier, codeChallenge };
  }
}

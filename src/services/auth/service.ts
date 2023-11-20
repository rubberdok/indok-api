import crypto from "crypto";

import { env } from "@/config.js";
import { User } from "@/domain/users.js";

export interface AuthProvider {
  baseUrl: string;
  token: string;
  authorization: string;
  redirectURL: string;
  clientId: string;
  userInfo: string;
}

export interface UserService {
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

interface AuthClient {
  fetchUserInfo(params: { url: string; accessToken: string }): Promise<UserInfo>;
  fetchAccessToken(params: { url: string; body: URLSearchParams; authorization: string }): Promise<string>;
}

interface UserInfo {
  sub: string;
  name: string;
  "dataporten-userid_sec": string[];
  email: string;
}

export class AuthService {
  constructor(
    private userService: UserService,
    private authClient: AuthClient,
    private authProvider: AuthProvider
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

    const url = new URL(this.authProvider.authorization, this.authProvider.baseUrl);
    const searchParams = new URLSearchParams({
      client_id: this.authProvider.clientId,
      scope: this.scope,
      response_type: "code",
      code_challenge_method: "S256",
      code_challenge: codeChallenge,
      redirect_uri: this.authProvider.redirectURL,
      ...(state ? { state } : {}),
    });

    url.search = searchParams.toString();

    return {
      url: url.toString(),
      codeVerifier,
      codeChallenge,
    };
  }

  async getUser(params: { code: string; codeVerifier: string }): Promise<User> {
    const { code, codeVerifier } = params;
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
    const url = new URL(this.authProvider.userInfo, this.authProvider.baseUrl).toString();

    return await this.authClient.fetchUserInfo({ url, accessToken });
  }

  private async getAccessToken(code: string, codeVerifier: string): Promise<string> {
    const url = new URL(this.authProvider.token, this.authProvider.baseUrl).toString();

    // https://en.wikipedia.org/wiki/Basic_access_authentication
    const authorization =
      "Basic " + Buffer.from(`${env.FEIDE_CLIENT_ID}:${env.FEIDE_CLIENT_SECRET}`).toString("base64url");

    const data = {
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
      code,
      redirect_uri: this.authProvider.redirectURL,
      client_id: this.authProvider.clientId,
    };

    const body = new URLSearchParams(data);

    return await this.authClient.fetchAccessToken({ url, body, authorization });
  }

  private pkce(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = crypto.randomBytes(32).toString("base64url");
    const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");

    return { codeVerifier, codeChallenge };
  }
}

export interface UserInfo {
  sub: string;
  name: string;
  "dataporten-userid_sec": string[];
  email: string;
}

export interface OAuthClient {
  fetchUserInfo(params: { url: string; accessToken: string }): Promise<UserInfo>;
  fetchAccessToken(params: { url: string; body: URLSearchParams; authorization: string }): Promise<string>;
}

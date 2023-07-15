import { OAuthClient, UserInfo } from "../../interfaces.js";

export interface FeideResponses {
  token: {
    status: number;
    data: {
      access_token: string;
      id_token: string;
    };
  };
  userInfo: {
    status: number;
    data: UserInfo;
  };
}

export function setupMockFeideClient({ responses }: { responses?: FeideResponses }): OAuthClient {
  return {
    async fetchUserInfo() {
      const userInfo = responses?.userInfo;
      if (!userInfo) return Promise.reject(new Error("undefined respones"));

      if (userInfo.status === 200) {
        return Promise.resolve(userInfo.data);
      }
      return Promise.reject(new Error("error"));
    },
    async fetchAccessToken() {
      const token = responses?.token;
      if (!token) return Promise.reject(new Error("undefined respones"));

      if (token.status === 200) {
        return Promise.resolve(token.data.access_token);
      }
      return Promise.reject(new Error("error"));
    },
  };
}

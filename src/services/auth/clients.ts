import fetch from "node-fetch";
import { OAuthClient, UserInfo } from "./interfaces";

export const feideClient: OAuthClient = {
  async fetchUserInfo({ url, accessToken }) {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    if (res.ok) {
      const json: UserInfo = await res.json();
      return json;
    } else {
      const reason = await res.text();
      throw new Error(reason);
    }
  },

  async fetchAccessToken({ url, body, authorization }) {
    const res = await fetch(url, {
      method: "POST",
      body: body,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        authorization,
      },
    });

    if (res.ok) {
      const json: { access_token: string; id_token: string } = await res.json();
      return json.access_token;
    } else {
      const reason = await res.text();
      throw new Error(reason);
    }
  },
};

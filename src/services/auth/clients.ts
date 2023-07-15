import fetch from "node-fetch";
import { z } from "zod";

import { OAuthClient } from "./interfaces.js";

export const feideClient: OAuthClient = {
  async fetchUserInfo({ url, accessToken }) {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    if (res.ok) {
      const parsed = userInfoSchema.safeParse(await res.json());
      if (!parsed.success) {
        throw new Error("Failed to parse user info response");
      }
      return parsed.data;
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
      const parsed = tokenSchema.safeParse(await res.json());
      if (!parsed.success) {
        throw new Error("Failed to parse token response");
      }
      return parsed.data.access_token;
    } else {
      const reason = await res.text();
      throw new Error(reason);
    }
  },
};

const userInfoSchema = z.object({
  sub: z.string(),
  name: z.string(),
  "dataporten-userid_sec": z.array(z.string()),
  email: z.string().email(),
});

const tokenSchema = z.object({
  access_token: z.string(),
  id_token: z.string(),
});

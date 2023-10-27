import { env } from "@/config.js";
import { AuthProvider } from "./service.js";

export const FeideProvider: AuthProvider = {
  baseUrl: env.FEIDE_BASE_URL,
  token: "/oauth/token",
  authorization: "/oauth/authorization",
  redirectURL: env.FEIDE_REDIRECT_URI,
  clientId: env.FEIDE_CLIENT_ID,
  userInfo: "/openid/userinfo",
};

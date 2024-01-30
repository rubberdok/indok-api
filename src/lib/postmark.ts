import { ServerClient } from "postmark";
import { env } from "~/config.js";

export default new ServerClient(env.POSTMARK_API_TOKEN);

export type IMailClient = ServerClient;

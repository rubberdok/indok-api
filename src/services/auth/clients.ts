import { Issuer } from "openid-client";
import { env } from "~/config.js";

const feideIssuer = await Issuer.discover(env.FEIDE_BASE_URL);

const feideClient = new feideIssuer.Client({
	client_id: env.FEIDE_CLIENT_ID,
	client_secret: env.FEIDE_CLIENT_SECRET,
	redirect_uris: [new URL("/auth/authenticate", env.SERVER_URL).toString()],
	response_types: ["code"],
});

export { feideClient };

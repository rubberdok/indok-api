import { mockDeep } from "jest-mock-extended";
import { ServerClient } from "postmark";

function postmark(apiToken: string, options?: { useTestMode: boolean }) {
	if (options?.useTestMode) {
		return mockDeep<ServerClient>();
	}
	return new ServerClient(apiToken);
}

export { postmark };

export type IMailClient = ServerClient;

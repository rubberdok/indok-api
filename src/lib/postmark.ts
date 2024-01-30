import { ServerClient, type TemplatedMessage } from "postmark";
import type { MessageSendingResponse } from "postmark/dist/client/models/index.js";

type EmailClient = {
	sendEmailWithTemplate: (
		template: TemplatedMessage,
	) => Promise<undefined | MessageSendingResponse>;
};

function postmark(
	apiToken: string,
	options?: { useTestMode: boolean },
): EmailClient {
	if (options?.useTestMode) {
		return {
			sendEmailWithTemplate(data) {
				console.log("Email sent with test mode:", data);
				return Promise.resolve(undefined);
			},
		};
	}
	return new ServerClient(apiToken);
}

export { postmark };

export type IMailClient = EmailClient;

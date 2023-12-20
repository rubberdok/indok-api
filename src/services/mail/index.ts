import { EmailContent, IMailClient } from "~/lib/postmark.js";

export class MailService {
	constructor(private client: IMailClient, private noReplyEmail: string) {}

	send(template: EmailContent) {
		return this.client.sendEmailWithTemplate({
			...template,
			From: template.From ?? this.noReplyEmail,
		});
	}
}

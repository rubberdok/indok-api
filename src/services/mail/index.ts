import { EmailContent, IMailClient, IMailService } from "./interfaces.js";

export class MailService implements IMailService {
  constructor(
    private client: IMailClient,
    private noReplyEmail: string
  ) {}

  send(template: EmailContent) {
    return this.client.sendEmailWithTemplate({
      ...template,
      From: template.From ?? this.noReplyEmail,
    });
  }
}

import { env } from "@/config";

import { EmailContent, IMailClient, IMailService } from "./interfaces";

export class MailService implements IMailService {
  constructor(private client: IMailClient) {}

  send(template: EmailContent) {
    return this.client.sendEmailWithTemplate({
      ...template,
      From: template.From ?? env.NO_REPLY_EMAIL,
    });
  }
}

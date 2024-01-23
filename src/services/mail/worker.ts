import type { Processor } from "bullmq";
import type { Redis } from "ioredis";
import type { Logger } from "pino";
import type { MessageSendingResponse } from "postmark/dist/client/models/index.js";
import type { User } from "~/domain/users.js";
import { type Queue, Worker } from "~/lib/mq.js";
import type { EmailContent } from "~/lib/postmark.js";

export type UserService = {
	get(id: string): Promise<User>;
};

type MailService = {
	send(content: EmailContent): Promise<MessageSendingResponse>;
};

type EmailQueueDataType = {
	recipientId: string;
};

type EmailQueueNameType = "welcome";

const MailWorkerService = (dependencies: {
	mailService: MailService;
	userService: UserService;
	redisClient: Redis;
	log?: Logger;
}): MailWorker => {
	const processor: Processor<EmailQueueDataType, void, EmailQueueNameType> =
		async (job) => {
			const { recipientId } = job.data;
			const user = await dependencies.userService.get(recipientId);
			dependencies.log?.info(
				{ job, recipient: user.id },
				"sending email to user",
			);

			switch (job.name) {
				case "welcome": {
					await dependencies.mailService.send({
						To: user.email,
						TemplateAlias: "welcome",
						TemplateModel: {
							firstName: user.firstName,
							lastName: user.lastName,
						},
					});
					return;
				}
			}
		};

	const worker = new Worker(
		"email",
		processor,
		{
			connection: dependencies.redisClient,
		},
		undefined,
		dependencies.log,
	);

	return worker;
};

type MailQueue = Queue<EmailQueueDataType, void, EmailQueueNameType>;
type MailWorker = Worker<EmailQueueDataType, void, EmailQueueNameType>;

export { MailWorkerService };

export type { EmailQueueDataType, EmailQueueNameType, MailQueue, MailWorker };

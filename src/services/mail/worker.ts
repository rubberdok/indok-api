import type { Processor } from "bullmq";
import type { MessageSendingResponse } from "postmark/dist/client/models/index.js";
import type { User } from "~/domain/users.js";
import type { Queue } from "~/lib/bullmq/queue.js";
import type { Worker } from "~/lib/bullmq/worker.js";
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

type EmailQueueType = Queue<EmailQueueDataType, void, EmailQueueNameType>;
type EmailWorkerType = Worker<EmailQueueDataType, void, EmailQueueNameType>;

const EmailHandler = (dependencies: {
	mailService: MailService;
	userService: UserService;
}): Processor<EmailQueueDataType, void, EmailQueueNameType> => {
	return async (job) => {
		const { recipientId } = job.data;
		const user = await dependencies.userService.get(recipientId);

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
};

function getEmailHandler(dependencies: {
	mailService: MailService;
	userService: UserService;
}): {
	handler: Processor<EmailQueueDataType, void, EmailQueueNameType>;
	name: "email";
} {
	return {
		handler: EmailHandler(dependencies),
		name: "email",
	};
}

export type {
	EmailQueueDataType,
	EmailQueueNameType,
	EmailQueueType,
	EmailWorkerType,
};

export { EmailHandler, getEmailHandler };

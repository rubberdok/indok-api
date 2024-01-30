import type { Job, Processor } from "bullmq";
import { DateTime } from "luxon";
import type { MessageSendingResponse } from "postmark/dist/client/models/index.js";
import type { Event } from "~/domain/events.js";
import type { User } from "~/domain/users.js";
import type { Queue } from "~/lib/bullmq/queue.js";
import type { Worker } from "~/lib/bullmq/worker.js";
import type { EmailContent } from "~/lib/postmark.js";

export type UserService = {
	get(id: string): Promise<User>;
};

export type EventService = {
	get(id: string): Promise<Event>;
};

type MailService = {
	send(content: EmailContent): Promise<MessageSendingResponse>;
};

type EmailRecipientType = {
	recipientId: string;
};

type EmailQueueNameType = "send-email";

type EmailWorkerHelperType<TData, TReturn, TName extends string> = {
	QueueType: Queue<TData & EmailRecipientType, TReturn, TName>;
	WorkerType: Worker<TData & EmailRecipientType, TReturn, TName>;
	ProcessorType: Processor<TData & EmailRecipientType, TReturn, TName>;
	JobType: Job<TData & EmailRecipientType, TReturn, TName>;
};

type EmailWorker = EmailWorkerHelperType<
	| {
			type: "event-wait-list-confirmation";
			eventId: string;
			recipientId: string;
	  }
	| { type: "user-registration"; recipientId: string },
	void,
	EmailQueueNameType
>;

type EmailQueueType = EmailWorker["QueueType"];
type EmailWorkerType = EmailWorker["WorkerType"];
type EmailProcessorType = EmailWorker["ProcessorType"];
type EmailJobType = EmailWorker["JobType"];

const EmailQueueName = "email" as const;

const EmailHandler = ({
	mailService,
	userService,
	eventService,
}: {
	mailService: MailService;
	userService: UserService;
	eventService: EventService;
}): EmailProcessorType => {
	return async (job: EmailJobType) => {
		const { recipientId, type } = job.data;
		const user = await userService.get(recipientId);

		switch (type) {
			case "user-registration": {
				await mailService.send({
					To: user.email,
					TemplateAlias: "welcome",
					TemplateModel: {
						firstName: user.firstName,
						lastName: user.lastName,
					},
				});
				return;
			}
			case "event-wait-list-confirmation": {
				const { eventId } = job.data;
				const event = await eventService.get(eventId);
				await mailService.send({
					To: user.email,
					TemplateAlias: "event-wait-list",
					TemplateModel: {
						subject: "Du har fått plass på arrangementet",
						eventName: event.name,
						eventStartAt: DateTime.fromJSDate(event.startAt).toFormat("fff", {
							locale: "nb",
						}),
						location: event.location,
					},
				});
			}
		}
	};
};

function getEmailHandler(dependencies: {
	mailService: MailService;
	userService: UserService;
	eventService: EventService;
}): {
	handler: EmailProcessorType;
	name: typeof EmailQueueName;
} {
	return {
		handler: EmailHandler(dependencies),
		name: EmailQueueName,
	};
}

export type { EmailQueueNameType, EmailQueueType, EmailWorkerType };

export { EmailHandler, getEmailHandler };

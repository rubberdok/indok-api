import type { Job, Processor } from "bullmq";
import { DateTime } from "luxon";
import type { MessageSendingResponse } from "postmark/dist/client/models/index.js";
import { env } from "~/config.js";
import type { Event } from "~/domain/events.js";
import type { StudyProgram, User } from "~/domain/users.js";
import type { Queue } from "~/lib/bullmq/queue.js";
import type { Worker } from "~/lib/bullmq/worker.js";
import type { MailContent } from "./index.js";

export type UserService = {
	get(id: string): Promise<User>;
	getStudyProgram(by: { id: string }): Promise<StudyProgram | null>;
};

export type EventService = {
	get(id: string): Promise<Event>;
};

type MailService = {
	send(content: MailContent): Promise<MessageSendingResponse>;
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
				let studyProgram: string | undefined;
				if (user.studyProgramId) {
					const program = await userService.getStudyProgram({
						id: user.studyProgramId,
					});
					studyProgram = program?.name;
				}

				await mailService.send({
					to: user.email,
					templateAlias: "user-registration",
					content: {
						user: {
							firstName: user.firstName,
							lastName: user.lastName,
							studyProgram,
						},
					},
				});
				return;
			}
			case "event-wait-list-confirmation": {
				const { eventId } = job.data;
				const event = await eventService.get(eventId);
				await mailService.send({
					to: user.email,
					templateAlias: "event-wait-list",
					content: {
						event: {
							name: event.name,
							startAt: DateTime.fromJSDate(event.startAt).toLocaleString(
								{
									...DateTime.DATETIME_HUGE,
									timeZoneName: undefined,
									timeZone: "Europe/Oslo",
								},
								{ locale: "nb" },
							),
							location: event.location,
							url: new URL(`/events/${event.id}`, env.CLIENT_URL).toString(),
						},
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

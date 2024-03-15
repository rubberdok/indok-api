import type { Processor } from "bullmq";
import type { Logger } from "pino";
import { InvalidArgumentError } from "~/domain/errors.js";
import type { EventSignUp, EventType } from "~/domain/events/index.js";
import { Event } from "~/domain/events/index.js";
import type { Queue } from "~/lib/bullmq/queue.js";
import type { Worker } from "~/lib/bullmq/worker.js";
import type { TResult } from "~/lib/result.js";
import type { Context } from "../../lib/context.js";
import type { EmailQueueDataType } from "../mail/worker.js";

type SignUpQueueDataType = { eventId: string };
type SignUpQueueReturnType = TResult<
	Record<string, never>,
	InvalidArgumentError
>;
type SignUpQueueNameType = "event-capacity-increased";

type SignUpQueueType = Queue<
	SignUpQueueDataType,
	SignUpQueueReturnType,
	SignUpQueueNameType
>;

type SignUpWorkerType = Worker<
	SignUpQueueDataType,
	SignUpQueueReturnType,
	SignUpQueueNameType
>;

export type { SignUpQueueType, SignUpWorkerType };

const SignUpQueueName = "sign-up" as const;

type EventService = {
	promoteFromWaitList(
		ctx: Context,
		eventId: string,
	): Promise<EventSignUp | null>;
	get(id: string): Promise<EventType>;
};

type MailService = {
	sendAsyncBulk(data: EmailQueueDataType[]): Promise<void>;
};
const getSignUpWorkerHandler = ({
	events,
	mailService,
	log,
}: { events: EventService; mailService: MailService; log: Logger }): {
	name: string;
	handler: Processor<
		SignUpQueueDataType,
		SignUpQueueReturnType,
		SignUpQueueNameType
	>;
} => {
	return {
		name: SignUpQueueName,
		handler: async (job) => {
			const { eventId } = job.data;
			const event = await events.get(eventId);

			switch (job.name) {
				case "event-capacity-increased": {
					if (Event.isSignUpEvent(event)) {
						const maxAttempts = event.remainingCapacity;
						const newSignUps: EventSignUp[] = [];
						for (let attempt = 0; attempt < maxAttempts; attempt++) {
							const signUp = await events.promoteFromWaitList(
								{ log, user: null },
								eventId,
							);
							if (signUp !== null) {
								newSignUps.push(signUp);
							} else {
								break;
							}
						}
						await mailService.sendAsyncBulk(
							newSignUps.map((newSignUp) => {
								return {
									type: "event-wait-list-confirmation",
									eventId: newSignUp.eventId,
									recipientId: newSignUp.userId,
								};
							}),
						);
						return {
							ok: true,
							data: {},
						};
					}
					return {
						ok: false,
						error: new InvalidArgumentError(
							"EventType is not accepting sign-ups",
						),
					};
				}
			}
		},
	};
};

export { getSignUpWorkerHandler, SignUpQueueName };

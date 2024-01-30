import type { Booking } from "@prisma/client";
import type { Job, Processor } from "bullmq";
import { DateTime } from "luxon";
import { env } from "~/config.js";
import type { Event } from "~/domain/events.js";
import type { StudyProgram, User } from "~/domain/users.js";
import type { Queue } from "~/lib/bullmq/queue.js";
import type { Worker } from "~/lib/bullmq/worker.js";
import type { ResultAsync } from "~/lib/result.js";
import type { MailContent } from "./index.js";

export type UserService = {
	get(id: string): Promise<User>;
	getStudyProgram(by: { id: string }): Promise<StudyProgram | null>;
};

export type EventService = {
	get(id: string): Promise<Event>;
};

export type CabinService = {
	getBooking(by: { id: string }): ResultAsync<{ booking: Booking }>;
};

type MailService = {
	send(data: MailContent): Promise<void>;
};

type EmailQueueNameType = "send-email";

type EmailWorkerHelperType<TData, TReturn, TName extends string> = {
	QueueType: Queue<TData, TReturn, TName>;
	WorkerType: Worker<TData, TReturn, TName>;
	ProcessorType: Processor<TData, TReturn, TName>;
	JobType: Job<TData, TReturn, TName>;
};

type EmailQueueDataType =
	| {
			type: "event-wait-list-confirmation";
			eventId: string;
			recipientId: string;
	  }
	| { type: "user-registration"; recipientId: string }
	| { type: "cabin-booking-receipt"; bookingId: string };

type EmailWorker = EmailWorkerHelperType<
	EmailQueueDataType,
	{ ok: boolean },
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
	cabinService,
}: {
	mailService: MailService;
	userService: UserService;
	eventService: EventService;
	cabinService: CabinService;
}): EmailProcessorType => {
	return async (job: EmailJobType) => {
		const { type } = job.data;

		switch (type) {
			case "user-registration": {
				const { recipientId } = job.data;
				const user = await userService.get(recipientId);
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
				return {
					ok: true,
				};
			}
			case "event-wait-list-confirmation": {
				const { eventId, recipientId } = job.data;
				const user = await userService.get(recipientId);
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
				return {
					ok: true,
				};
			}
			case "cabin-booking-receipt": {
				const { bookingId } = job.data;
				const getBookingResult = await cabinService.getBooking({
					id: bookingId,
				});
				if (!getBookingResult.ok) {
					return {
						ok: false,
					};
				}
				const { booking } = getBookingResult.data;
				const user = await userService.get(booking.email);
				await mailService.send({
					to: user.email,
					templateAlias: "cabin-booking-receipt",
					content: {
						booking: {
							price: "",
						},
					},
				});
				return {
					ok: true,
				};
			}
		}
	};
};

function getEmailHandler(dependencies: {
	mailService: MailService;
	userService: UserService;
	eventService: EventService;
	cabinService: CabinService;
}): {
	handler: EmailProcessorType;
	name: typeof EmailQueueName;
} {
	return {
		handler: EmailHandler(dependencies),
		name: EmailQueueName,
	};
}

export type {
	EmailQueueNameType,
	EmailQueueType,
	EmailWorkerType,
	EmailQueueDataType,
};

export { EmailHandler, getEmailHandler };

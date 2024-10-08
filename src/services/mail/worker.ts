import { type Job, type Processor, UnrecoverableError } from "bullmq";
import { DateTime } from "luxon";
import type { Logger } from "pino";
import { env } from "~/config.js";
import type { Booking, BookingTerms } from "~/domain/cabins.js";
import type {
	DownstreamServiceError,
	InternalServerError,
	NotFoundError,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
import type { EventType } from "~/domain/events/index.js";
import type { OrderType, ProductType } from "~/domain/products.js";
import type { StudyProgram, User } from "~/domain/users.js";
import type { Queue } from "~/lib/bullmq/queue.js";
import type { Worker } from "~/lib/bullmq/worker.js";
import type { Context } from "~/lib/context.js";
import type { ResultAsync } from "~/lib/result.js";
import type { Attachment, MailContent } from "./index.js";

export type ProductService = {
	orders: {
		get(
			ctx: Context,
			params: { id: string },
		): ResultAsync<
			{ order: OrderType },
			| NotFoundError
			| UnauthorizedError
			| PermissionDeniedError
			| InternalServerError
		>;
	};
	products: {
		get(
			_ctx: Context,
			params: { id: string },
		): ResultAsync<{ product: ProductType }, NotFoundError>;
	};
};

export type UserService = {
	get(id: string): Promise<User>;
	getStudyProgram(by: { id: string }): Promise<StudyProgram | null>;
};

export type EventService = {
	get(id: string): Promise<EventType>;
};

export type CabinService = {
	getBooking(
		ctx: Context,
		by: { id: string },
	): ResultAsync<{ booking: Booking }, NotFoundError | InternalServerError>;
	getBookingTerms(
		ctx: Context,
	): ResultAsync<
		{ bookingTerms: BookingTerms },
		NotFoundError | InternalServerError
	>;
};

type MailService = {
	send(data: MailContent, attachments?: Attachment[]): Promise<void>;
};

export type FileService = {
	downloadFileToBuffer(
		ctx: Context,
		params: { id: string },
	): ResultAsync<
		{ buffer: Buffer },
		NotFoundError | InternalServerError | DownstreamServiceError
	>;
};

const EmailQueueName = "email" as const;
type EmailQueueNameType = typeof EmailQueueName;

type EmailWorkerHelperType<TData, TReturn, TJobName extends string> = {
	QueueType: Queue<TData, TReturn, TJobName>;
	WorkerType: Worker<TData, TReturn, TJobName>;
	ProcessorType: Processor<TData, TReturn, TJobName>;
	JobType: Job<TData, TReturn, TJobName>;
};

type EmailQueueDataType =
	| {
			type: "event-wait-list-confirmation";
			eventId: string;
			recipientId: string;
	  }
	| { type: "user-registration"; recipientId: string }
	| { type: "cabin-booking-receipt"; bookingId: string }
	| { type: "order-receipt"; orderId: string; userId: string };

type EmailJobNameType = "send-email";

type EmailWorker = EmailWorkerHelperType<
	EmailQueueDataType,
	{ ok: boolean },
	EmailJobNameType
>;

type EmailQueueType = EmailWorker["QueueType"];
type EmailWorkerType = EmailWorker["WorkerType"];
type EmailProcessorType = EmailWorker["ProcessorType"];
type EmailJobType = EmailWorker["JobType"];

type Dependencies = {
	mailService: MailService;
	userService: UserService;
	eventService: EventService;
	cabinService: CabinService;
	fileService: FileService;
	productService: ProductService;
	logger: Logger;
};

const EmailHandler = ({
	mailService,
	userService,
	eventService,
	cabinService,
	fileService,
	productService,
	logger,
}: Dependencies): EmailProcessorType => {
	return async (job: EmailJobType) => {
		const { type } = job.data;
		const ctx: Context = {
			log: logger,
			user: null,
		};
		ctx.log.info({ type }, "processing email job");

		switch (type) {
			case "user-registration": {
				const { recipientId } = job.data;
				const user = await userService.get(recipientId);
				let studyProgram: string | undefined;
				if (user.confirmedStudyProgramId) {
					const program = await userService.getStudyProgram({
						id: user.confirmedStudyProgramId,
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
						},
						actionUrl: new URL(
							`/events/${event.id}`,
							env.CLIENT_URL,
						).toString(),
					},
				});
				return {
					ok: true,
				};
			}
			case "cabin-booking-receipt": {
				const { bookingId } = job.data;
				ctx.log.info({ bookingId }, "fetching booking");
				const getBookingResult = await cabinService.getBooking(ctx, {
					id: bookingId,
				});
				if (!getBookingResult.ok) {
					switch (getBookingResult.error.name) {
						case "NotFoundError":
							throw new UnrecoverableError("Booking does not exist");
						case "InternalServerError":
							throw getBookingResult.error;
					}
				}
				const { booking } = getBookingResult.data;

				ctx.log.info("fetching the latest booking terms");
				const getBookingTermsResult = await cabinService.getBookingTerms(ctx);
				if (!getBookingTermsResult.ok) {
					switch (getBookingTermsResult.error.name) {
						case "InternalServerError":
						case "NotFoundError":
							throw getBookingTermsResult.error;
					}
				}
				const { bookingTerms } = getBookingTermsResult.data;

				ctx.log.info(bookingTerms, "downloading booking terms file");
				const downloadFileToBufferResult =
					await fileService.downloadFileToBuffer(ctx, {
						id: bookingTerms.fileId,
					});

				if (!downloadFileToBufferResult.ok) {
					switch (downloadFileToBufferResult.error.name) {
						case "NotFoundError":
						case "InternalServerError":
						case "DownstreamServiceError":
							throw downloadFileToBufferResult.error;
					}
				}
				const { buffer } = downloadFileToBufferResult.data;

				ctx.log.info("sending booking receipt email");
				await mailService.send(
					{
						to: booking.email,
						templateAlias: "cabin-booking-receipt",
						content: {
							booking: {
								price: booking.totalCost.toString(),
							},
						},
					},
					[
						{
							name: "Bestillingsvilkår.pdf",
							content: buffer.toString("base64"),
							contentId: bookingTerms.fileId,
							contentType: "application/pdf",
							contentLength: buffer.byteLength,
						},
					],
				);
				return {
					ok: true,
				};
			}
			case "order-receipt": {
				const { orderId, userId } = job.data;
				const user = await userService.get(userId);

				const ctx: Context = {
					user,
					log: logger,
				};

				const getOrderResult = await productService.orders.get(ctx, {
					id: orderId,
				});
				if (!getOrderResult.ok) {
					switch (getOrderResult.error.name) {
						case "NotFoundError":
							throw new UnrecoverableError("Order does not exist");
						case "InternalServerError":
							throw getOrderResult.error;
						case "PermissionDeniedError":
						case "UnauthorizedError":
							throw new UnrecoverableError("Permission denied");
					}
				}
				const { order } = getOrderResult.data;
				const getProductResult = await productService.products.get(ctx, {
					id: order.productId,
				});
				if (!getProductResult.ok) {
					switch (getProductResult.error.name) {
						case "NotFoundError":
							throw new UnrecoverableError("Product does not exist");
					}
				}

				await mailService.send({
					to: user.email,
					templateAlias: "order-receipt",
					content: {
						user,
						order: {
							id: order.id,
							purchasedAt: order.purchasedAt
								? DateTime.fromJSDate(order.purchasedAt).toLocaleString(
										{
											...DateTime.DATETIME_HUGE,
											timeZoneName: undefined,
											timeZone: "Europe/Oslo",
										},
										{ locale: "nb" },
									)
								: "",
							totalPrice: order.totalPrice,
						},
						product: getProductResult.data.product,
						actionUrl: new URL(
							`/profile/orders/${order.id}?reference=${order.capturedPaymentAttemptReference}`,
							env.CLIENT_URL,
						).toString(),
					},
				});
				return {
					ok: true,
					data: {},
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
	fileService: FileService;
	productService: ProductService;
	logger: Logger;
}): {
	handler: EmailProcessorType;
	name: EmailQueueNameType;
} {
	return {
		handler: EmailHandler(dependencies),
		name: EmailQueueName,
	};
}

export type { EmailQueueDataType, EmailQueueType, EmailWorkerType };

export { getEmailHandler, EmailQueueName };

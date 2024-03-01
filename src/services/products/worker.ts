import { DelayedError, type Processor, UnrecoverableError } from "bullmq";
import { DateTime } from "luxon";
import type { Logger } from "pino";
import type {
	DownstreamServiceError,
	InternalServerError,
	InvalidArgumentError,
	NotFoundError,
} from "~/domain/errors.js";
import type { OrderType, PaymentAttemptType } from "~/domain/products.js";
import type { Queue } from "~/lib/bullmq/queue.js";
import type { Worker } from "~/lib/bullmq/worker.js";
import type { Result, ResultAsync } from "~/lib/result.js";
import type { Context } from "../../lib/context.js";

type PaymentProcessingDataType = { reference: string };
type PaymentProcessingResultType = Result<
	Record<string, never>,
	InternalServerError | NotFoundError
>;
type PaymentProcessingNameType = "payment-attempt-polling" | "capture-payment";

type PaymentProcessingWorkerType = Worker<
	PaymentProcessingDataType,
	PaymentProcessingResultType,
	PaymentProcessingNameType
>;

type PaymentProcessingQueueType = Queue<
	PaymentProcessingDataType,
	PaymentProcessingResultType,
	PaymentProcessingNameType
>;

type ProductService = {
	payments: {
		get(
			ctx: Context,
			params: { reference: string },
		): ResultAsync<
			{ paymentAttempt: PaymentAttemptType | null },
			InternalServerError
		>;
		updatePaymentAttemptState(
			ctx: Context,
			paymentAttempt: PaymentAttemptType,
		): ResultAsync<
			{ paymentAttempt: PaymentAttemptType },
			NotFoundError | InternalServerError | DownstreamServiceError
		>;
		capture(
			ctx: Context,
			{ reference }: { reference: string },
		): ResultAsync<
			{ paymentAttempt: PaymentAttemptType; order: OrderType },
			| NotFoundError
			| InternalServerError
			| InvalidArgumentError
			| DownstreamServiceError
		>;
	};
};

const PaymentProcessingQueueName = "payment-processing" as const;

function getPaymentProcessingHandler({
	productService,
	log,
}: {
	productService: ProductService;
	log: Logger;
}): {
	name: typeof PaymentProcessingQueueName;
	handler: Processor<
		PaymentProcessingDataType,
		PaymentProcessingResultType,
		PaymentProcessingNameType
	>;
} {
	const paymentAttemptPollingHandler = buildPaymentAttemptPollingHandler({
		log,
		productService,
	});
	const capturePaymentHandler = buildCapturePaymentHandler({
		log,
		productService,
	});

	const processor: Processor<
		PaymentProcessingDataType,
		PaymentProcessingResultType,
		PaymentProcessingNameType
	> = (job) => {
		switch (job.name) {
			case "payment-attempt-polling":
				return paymentAttemptPollingHandler(job);
			case "capture-payment":
				return capturePaymentHandler(job);
			default:
				throw new UnrecoverableError("Unknown job name");
		}
	};

	return {
		name: PaymentProcessingQueueName,
		handler: processor,
	};
}

function buildPaymentAttemptPollingHandler(dependencies: {
	productService: ProductService;
	log: Logger;
}) {
	const { productService, log } = dependencies;
	const paymentAttemptPollingHandler: Processor<
		PaymentProcessingDataType,
		PaymentProcessingResultType,
		PaymentProcessingNameType
	> = async (job, token) => {
		const { reference } = job.data;
		const ctx = { log, user: null };

		const result = await productService.payments.get(ctx, {
			reference,
		});

		if (!result.ok) {
			log.error({ error: result.error }, "Failed to get payment attempt");
			throw result.error;
		}

		const { paymentAttempt } = result.data;

		if (paymentAttempt === null) {
			log.error({ reference }, "Payment attempt not found for reference");
			throw new UnrecoverableError("Payment attempt not found");
		}

		const updateResult =
			await productService.payments.updatePaymentAttemptState(
				ctx,
				paymentAttempt,
			);
		if (updateResult.ok) {
			log.info({ reference }, "Payment attempt updated");
			return {
				ok: true,
				data: {},
			};
		}

		log.error(
			{ error: updateResult.error },
			"Failed to update payment attempt",
		);
		switch (updateResult.error.name) {
			case "DownstreamServiceError": {
				await job.moveToDelayed(60_000, token);
				throw new DelayedError("Downstream service error");
			}
			case "NotFoundError": {
				throw updateResult.error;
			}
			case "InternalServerError": {
				throw updateResult.error;
			}
			default: {
				throw new UnrecoverableError("Unknown error");
			}
		}
	};
	return paymentAttemptPollingHandler;
}

function buildCapturePaymentHandler(dependencies: {
	productService: ProductService;
	log: Logger;
}) {
	const { productService, log } = dependencies;
	const paymentAttemptPollingHandler: Processor<
		PaymentProcessingDataType,
		PaymentProcessingResultType,
		PaymentProcessingNameType
	> = async (job, token) => {
		const { reference } = job.data;
		const ctx = { log, user: null };

		const result = await productService.payments.capture(ctx, { reference });

		if (!result.ok) {
			switch (result.error.name) {
				case "DownstreamServiceError": {
					log.error(
						{ error: result.error },
						"Failed to capture payment with downstream service",
					);
					await job.moveToDelayed(
						DateTime.now().plus({ minutes: 1 }).toMillis(),
						token,
					);
					throw new DelayedError("Downstream service error");
				}
				case "NotFoundError": {
					log.error(
						{ error: result.error },
						"Failed to capture payment, payment attempt not found",
					);
					throw result.error;
				}
				case "InternalServerError": {
					log.error(
						{ error: result.error },
						"Failed to capture payment, internal server error",
					);
					throw new UnrecoverableError("Internal server error");
				}
				case "InvalidArgumentError": {
					log.error(
						{ error: result.error },
						"Failed to capture payment, invalid argument error",
					);
					throw new UnrecoverableError(
						"Failed to capture payment, recevied invalid argument error",
					);
				}
			}
		}
		return {
			ok: true,
			data: {},
		};
	};
	return paymentAttemptPollingHandler;
}

export { getPaymentProcessingHandler, PaymentProcessingQueueName };
export type {
	PaymentProcessingDataType,
	PaymentProcessingNameType,
	PaymentProcessingQueueType,
	PaymentProcessingResultType,
	PaymentProcessingWorkerType,
};

import { type Processor, UnrecoverableError } from "bullmq";
import type { Logger } from "pino";
import type { InternalServerError, NotFoundError } from "~/domain/errors.js";
import type { Queue } from "~/lib/bullmq/queue.js";
import type { Worker } from "~/lib/bullmq/worker.js";
import type { Result, ResultAsync } from "~/lib/result.js";
import type { Context } from "../../lib/context.js";
import type { PaymentAttemptType } from "~/domain/products.js";

type PaymentProcessingDataType = { reference: string };
type PaymentProcessingResultType = Result<
	Record<string, never>,
	InternalServerError | NotFoundError
>;
type PaymentProcessingNameType = "payment-processing";

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
			NotFoundError | InternalServerError
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
	const processor: Processor<
		PaymentProcessingDataType,
		PaymentProcessingResultType,
		PaymentProcessingNameType
	> = async (job) => {
		const { reference } = job.data;
		const ctx = { log, user: null };

		const result = await productService.payments.get(ctx, {
			reference,
		});

		if (!result.ok) {
			log.error({ error: result.error }, "Failed to get payment attempt");
			return {
				ok: false,
				error: result.error,
			};
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
		return {
			ok: false,
			error: updateResult.error,
		};
	};

	return {
		name: PaymentProcessingQueueName,
		handler: processor,
	};
}

export { getPaymentProcessingHandler, PaymentProcessingQueueName };
export type {
	PaymentProcessingDataType,
	PaymentProcessingNameType,
	PaymentProcessingQueueType,
	PaymentProcessingResultType,
	PaymentProcessingWorkerType,
};

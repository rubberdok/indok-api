import { type Processor, UnrecoverableError } from "bullmq";
import type { Logger } from "pino";
import type { PaymentAttempt } from "~/domain/products.js";
import type { Queue } from "~/lib/bullmq/queue.js";
import type { Worker } from "~/lib/bullmq/worker.js";
import type { Context } from "../context.js";

type PaymentProcessingDataType = { reference: string };
type PaymentProcessingResultType = undefined;
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
	getPaymentAttempt(
		ctx: Context,
		by: { reference: string },
	): Promise<{ paymentAttempt: PaymentAttempt | null }>;
	updatePaymentAttemptState(
		ctx: Context,
		paymentAttempt: PaymentAttempt,
	): Promise<{ paymentAttempt: PaymentAttempt }>;
};

function getPaymentProcessingHandler({
	productService,
	log,
}: {
	productService: ProductService;
	log: Logger;
}): {
	name: string;
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

		const { paymentAttempt } = await productService.getPaymentAttempt(ctx, {
			reference,
		});
		if (paymentAttempt === null) {
			log.error({ reference }, "Payment attempt not found for reference");
			throw new UnrecoverableError("Payment attempt not found");
		}

		await productService.updatePaymentAttemptState(ctx, paymentAttempt);
	};

	return {
		name: "payment-processing",
		handler: processor,
	};
}

export { getPaymentProcessingHandler };
export type {
	PaymentProcessingDataType,
	PaymentProcessingNameType,
	PaymentProcessingQueueType,
	PaymentProcessingResultType,
	PaymentProcessingWorkerType,
};

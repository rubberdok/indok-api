import type { Client } from "@vippsmobilepay/sdk";
import type { Job } from "bullmq";
import {
	InternalServerError,
	InvalidArgumentError,
	NotFoundError,
	UnauthorizedError,
} from "~/domain/errors.js";
import type {
	MerchantType,
	OrderPaymentStatus,
	OrderType,
	PaymentAttempt,
	PaymentAttemptState,
} from "~/domain/products.js";
import type { ResultAsync } from "~/lib/result.js";
import type { Context } from "../context.js";
import type { BuildProductsDependencies } from "./service.js";
import type {
	PaymentProcessingDataType,
	PaymentProcessingNameType,
	PaymentProcessingResultType,
} from "./worker.js";

function buildPayments({
	productRepository,
	vippsFactory,
	config,
	paymentProcessingQueue,
}: BuildProductsDependencies) {
	function paymentAttemptStateToOrderPaymentStatus(
		paymentAttempt: PaymentAttempt,
		order: OrderType,
	): OrderPaymentStatus {
		switch (paymentAttempt.state) {
			case "CREATED":
				return "CREATED";
			case "AUTHORIZED":
				return "RESERVED";
			default:
				return order.paymentStatus;
		}
	}
	function newClient(merchant: MerchantType): ReturnType<typeof Client> {
		return vippsFactory({
			merchantSerialNumber: merchant.serialNumber,
			useTestMode: config?.useTestMode,
			subscriptionKey: merchant.subscriptionKey,
			retryRequests: false,
		});
	}

	async function getToken(
		ctx: Context,
		client: ReturnType<typeof Client>,
		merchant: MerchantType,
	): Promise<string> {
		const accessToken = await client.auth.getToken({
			clientId: merchant.clientId,
			clientSecret: merchant.clientSecret,
			subscriptionKey: merchant.subscriptionKey,
		});

		if (!accessToken.ok) {
			ctx.log.error("Failed to fetch vipps access token");
			const err = new InternalServerError("Failed to fetch vipps access token");
			err.cause = accessToken.error;
			throw err;
		}

		return accessToken.data.access_token;
	}

	function isFinalPaymentState(status: PaymentAttemptState): boolean {
		return (
			status === "FAILED" ||
			status === "TERMINATED" ||
			status === "EXPIRED" ||
			status === "AUTHORIZED"
		);
	}

	async function getRemotePaymentState(
		ctx: Context,
		paymentAttempt: PaymentAttempt,
		order: OrderType,
	): ResultAsync<{ state: PaymentAttemptState }> {
		const { reference } = paymentAttempt;
		const { product } = await productRepository.getProduct(order.productId);
		if (product === null) {
			throw new NotFoundError("ProductType not found");
		}
		ctx.log.info({ reference }, "Fetching latest payment status from Vipps");
		const vipps = newClient(product.merchant);
		const token = await getToken(ctx, vipps, product.merchant);
		const response = await vipps.payment.info(token, reference);

		if (!response.ok) {
			ctx.log.error("Failed to fetch payment status from Vipps");
			const interalErr = new InternalServerError(
				"Failed to fetch payment status from Vipps",
			);
			interalErr.cause = response.error;
			return {
				ok: false,
				error: interalErr,
			};
		}

		return {
			ok: true,
			data: {
				state: response.data.state,
			},
		};
	}

	function getPaymentReference(order: OrderType, attempt: number) {
		return `indok-ntnu-${order.id}-${attempt}`;
	}

	return {
		getPaymentReference,

		/**
		 * initiatePaymentAttempt initiates a new payment attempt for the given order.
		 * If the payment attempt is created successfully, a polling job is added to the "payment-processing" queue.
		 */
		async initiatePaymentAttempt(
			ctx: Context,
			params: { orderId: string },
		): ResultAsync<
			{
				redirectUrl: string;
				paymentAttempt: PaymentAttempt;
				order: OrderType;
				pollingJob: Job<
					PaymentProcessingDataType,
					PaymentProcessingResultType,
					PaymentProcessingNameType
				>;
			},
			| UnauthorizedError
			| NotFoundError
			| InvalidArgumentError
			| InternalServerError
		> {
			if (!ctx.user) {
				return {
					ok: false,
					error: new UnauthorizedError(
						"You must be logged in to initiate payment",
					),
				};
			}

			const { order } = await productRepository.getOrder(params.orderId);
			if (order === null) {
				return {
					ok: false,
					error: new NotFoundError("OrderType not found"),
				};
			}
			if (order.paymentStatus === "CAPTURED") {
				return {
					ok: false,
					error: new InvalidArgumentError("OrderType has been captured"),
				};
			}
			if (order.paymentStatus === "CANCELLED") {
				return {
					ok: false,
					error: new InvalidArgumentError("OrderType has been cancelled"),
				};
			}
			if (order.paymentStatus === "REFUNDED") {
				return {
					ok: false,
					error: new InvalidArgumentError("OrderType has been refunded"),
				};
			}

			const { product } = await productRepository.getProduct(order?.productId);

			if (product === null) {
				return {
					ok: false,
					error: new NotFoundError("ProductType not found"),
				};
			}

			/**
			 * https://developer.vippsmobilepay.com/docs/knowledge-base/orderid
			 *
			 * The order ID must be unique for each order attempt. Recommended to suffix the order ID with a counter to
			 * easily identify multiple attempts for the same order.
			 */
			const reference = getPaymentReference(order, order.attempt + 1);

			const vipps = newClient(product.merchant);
			ctx.log.info(product.merchant);
			const token = await getToken(ctx, vipps, product.merchant);
			const vippsPayment = await vipps.payment.create(token, {
				reference: getPaymentReference(order, order.attempt + 1),
				amount: {
					value: product.price,
					currency: "NOK",
				},
				paymentMethod: {
					type: "WALLET",
				},
				userFlow: "WEB_REDIRECT",
				returnUrl: config.returnUrl,
				paymentDescription: product.description,
			});

			if (!vippsPayment.ok) {
				const error = new InternalServerError("Failed to create vipps payment");
				error.cause = vippsPayment.error;
				return {
					ok: false,
					error,
				};
			}

			const { paymentAttempt } = await productRepository.createPaymentAttempt({
				order: {
					id: order.id,
					version: order.version,
				},
				reference,
			});

			/**
			 * While Vipps has support for webhooks, they make no guarantees about the success of the webhook delivery,
			 * see https://developer.vippsmobilepay.com/docs/APIs/epayment-api/checklist/#avoid-integration-pitfalls
			 *
			 * https://developer.vippsmobilepay.com/docs/knowledge-base/polling-guidelines/?_highlight=pol
			 *
			 * Recommendations:
			 * - Wait 5 seconds before the first poll
			 * - Poll every 2 seconds
			 */
			const pollingJob = await paymentProcessingQueue.add(
				"payment-processing",
				{
					reference,
				},
				{
					jobId: reference,
					delay: 5 * 1000, // 5 seconds
					repeat: {
						every: 2 * 1000, // 2 seconds
						limit: 300, // After 5 seconds, we poll every 2 seconds. Payments expire after 10 minutes, so we poll for 10 minutes / 2 seconds = 300 times
					},
				},
			);

			return {
				ok: true,
				data: {
					redirectUrl: vippsPayment.data.redirectUrl,
					paymentAttempt,
					order,
					pollingJob,
				},
			};
		},

		async updatePaymentAttemptState(
			ctx: Context,
			paymentAttempt: PaymentAttempt,
		): ResultAsync<{ paymentAttempt: PaymentAttempt }> {
			const { reference } = paymentAttempt;

			const { order } = await productRepository.getOrder(
				paymentAttempt.orderId,
			);
			if (order === null) {
				return {
					ok: false,
					error: new NotFoundError("OrderType not found"),
				};
			}

			const result = await getRemotePaymentState(ctx, paymentAttempt, order);
			if (!result.ok) {
				return {
					ok: false,
					error: new InternalServerError(
						"Failed to fetch payment status from Vipps",
					),
				};
			}
			const { state: newState } = result.data;

			let updatedPaymentAttempt = paymentAttempt;
			if (newState !== paymentAttempt.state) {
				const orderPaymentStatus = paymentAttemptStateToOrderPaymentStatus(
					paymentAttempt,
					order,
				);
				const updated = await productRepository.updatePaymentAttempt(
					{
						id: paymentAttempt.id,
						version: paymentAttempt.version,
						state: newState,
					},
					{
						id: order.id,
						version: order.version,
						paymentStatus: orderPaymentStatus,
					},
				);
				updatedPaymentAttempt = updated.paymentAttempt;
			}

			if (isFinalPaymentState(newState)) {
				// Stop polling for this payment attempt as we have reached a final state.
				ctx.log.info({ reference }, "payment processed, removing from queue");
				const ok = await paymentProcessingQueue.removeRepeatable(
					"payment-processing",
					{
						every: 2 * 1000,
						limit: 300,
					},
					reference,
				);
				if (!ok) {
					ctx.log.error(
						{ reference },
						"Failed to remove payment attempt from payment processing queue",
					);
				} else {
					ctx.log.info(
						{ reference },
						"Successfully removed payment attempt from payment processing queue",
					);
				}
			}

			return { ok: true, data: { paymentAttempt: updatedPaymentAttempt } };
		},

		/**
		 * get returns a payment attempt.
		 *
		 * **NOTE**: This method does not check if the user is authorized to view the payment attempt,
		 * and should only be used internally.
		 */
		async get(
			ctx: Context,
			params: { reference: string },
		): ResultAsync<{ paymentAttempt: PaymentAttempt | null }> {
			const { reference } = params;
			ctx.log.info({ reference }, "Fetching payment attempt");

			const { paymentAttempt } = await productRepository.getPaymentAttempt({
				reference,
			});
			return { ok: true, data: { paymentAttempt } };
		},
	} as const;
}

export { buildPayments };

import type { Client } from "@vippsmobilepay/sdk";
import type { Job } from "bullmq";
import {
	DownstreamServiceError,
	InternalServerError,
	InvalidArgumentError,
	NotFoundError,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
import type {
	MerchantType,
	OrderPaymentStatus,
	OrderType,
	PaymentAttemptState,
	PaymentAttemptType,
} from "~/domain/products.js";
import type { ResultAsync } from "~/lib/result.js";
import { isValidRedirectUrl } from "~/utils/validateRedirectUrl.js";
import type { Context } from "../../lib/context.js";
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
	async function newClient(
		by: { merchantId: string } | { orderId: string } | { productId: string },
	): ResultAsync<
		{ client: ReturnType<typeof Client>; merchant: MerchantType },
		NotFoundError | InternalServerError
	> {
		const getMerchant = await productRepository.getMerchant(by);
		if (!getMerchant.ok) {
			return getMerchant;
		}

		const { merchant } = getMerchant.data;

		return {
			ok: true,
			data: {
				client: vippsFactory({
					merchantSerialNumber: merchant.serialNumber,
					useTestMode: config?.useTestMode,
					subscriptionKey: merchant.subscriptionKey,
					retryRequests: false,
				}),
				merchant,
			},
		};
	}

	async function getToken(
		ctx: Context,
		client: ReturnType<typeof Client>,
		merchant: MerchantType,
	): ResultAsync<{ token: string }, DownstreamServiceError> {
		const accessToken = await client.auth.getToken(
			merchant.clientId,
			merchant.clientSecret,
		);

		if (!accessToken.ok) {
			ctx.log.error("Failed to fetch vipps access token");
			return {
				ok: false,
				error: new DownstreamServiceError(
					"Failed to fetch vipps access token",
					accessToken.error,
				),
			};
		}

		return { ok: true, data: { token: accessToken.data.access_token } };
	}

	async function newClientWithToken(
		ctx: Context,
		merchantBy:
			| { merchantId: string }
			| { orderId: string }
			| { productId: string },
	): ResultAsync<
		{ client: ReturnType<typeof Client>; token: string },
		DownstreamServiceError | InternalServerError
	> {
		const vipps = await newClient(merchantBy);
		if (!vipps.ok) {
			ctx.log.error(
				{ merchantBy },
				"Failed to create Vipps client for merchant by",
			);
			return {
				ok: false,
				error: new InternalServerError(
					"Failed to create Vipps client for merchant",
					vipps.error,
				),
			};
		}
		const { client, merchant } = vipps.data;
		const tokenResult = await getToken(ctx, client, merchant);
		if (!tokenResult.ok) {
			return tokenResult;
		}
		const { token } = tokenResult.data;
		return {
			ok: true,
			data: {
				client,
				token,
			},
		};
	}

	function isFinalPaymentState(status: PaymentAttemptState): boolean {
		return (
			status === "FAILED" ||
			status === "TERMINATED" ||
			status === "EXPIRED" ||
			status === "AUTHORIZED" ||
			status === "ABORTED"
		);
	}

	async function getRemotePaymentState(
		ctx: Context,
		paymentAttempt: PaymentAttemptType,
	): ResultAsync<
		{ state: PaymentAttemptState },
		InternalServerError | DownstreamServiceError
	> {
		const { reference } = paymentAttempt;
		ctx.log.info({ reference }, "Fetching latest payment status from Vipps");
		const newClientResult = await newClientWithToken(ctx, {
			orderId: paymentAttempt.orderId,
		});
		if (!newClientResult.ok) {
			return newClientResult;
		}
		const { client, token } = newClientResult.data;
		const response = await client.payment.info(token, reference);

		if (!response.ok) {
			ctx.log.error("Failed to fetch payment status from Vipps");
			return {
				ok: false,
				error: new InternalServerError(
					"Failed to fetch payment status from Vipps",
					response.error,
				),
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
			params: { orderId: string; returnUrl: string },
		): ResultAsync<
			{
				redirectUrl: string;
				paymentAttempt: PaymentAttemptType;
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
			| DownstreamServiceError
		> {
			if (!ctx.user) {
				return {
					ok: false,
					error: new UnauthorizedError(
						"You must be logged in to initiate payment",
					),
				};
			}
			const redirectUrlResult = isValidRedirectUrl(params.returnUrl);
			if (!redirectUrlResult.ok) {
				return redirectUrlResult;
			}

			const getOrderResult = await productRepository.getOrder(params.orderId);
			if (!getOrderResult.ok) {
				return getOrderResult;
			}
			const { order } = getOrderResult.data;
			if (order === null) {
				return {
					ok: false,
					error: new NotFoundError("Order not found"),
				};
			}
			if (order.paymentStatus === "CAPTURED") {
				return {
					ok: false,
					error: new InvalidArgumentError("Order has been captured"),
				};
			}
			if (order.paymentStatus === "CANCELLED") {
				return {
					ok: false,
					error: new InvalidArgumentError("Order has been cancelled"),
				};
			}
			if (order.paymentStatus === "REFUNDED") {
				return {
					ok: false,
					error: new InvalidArgumentError("Order has been refunded"),
				};
			}
			if (order.paymentStatus === "RESERVED") {
				return {
					ok: false,
					error: new InvalidArgumentError(
						"Order already has a reserved payment",
					),
				};
			}

			const { product } = await productRepository.getProduct(order?.productId);

			if (product === null) {
				return {
					ok: false,
					error: new NotFoundError("Product not found"),
				};
			}

			/**
			 * https://developer.vippsmobilepay.com/docs/knowledge-base/orderid
			 *
			 * The order ID must be unique for each order attempt. Recommended to suffix the order ID with a counter to
			 * easily identify multiple attempts for the same order.
			 */
			const reference = getPaymentReference(order, order.attempt + 1);
			const returnUrl = redirectUrlResult.data.url;
			returnUrl.searchParams.set("reference", reference);

			const newClientResult = await newClientWithToken(ctx, {
				orderId: order.id,
			});
			if (!newClientResult.ok) {
				return newClientResult;
			}
			const { client, token } = newClientResult.data;
			const vippsPayment = await client.payment.create(token, {
				reference: getPaymentReference(order, order.attempt + 1),
				amount: {
					value: product.price,
					currency: "NOK",
				},
				paymentMethod: {
					type: "WALLET",
				},
				userFlow: "WEB_REDIRECT",
				returnUrl: returnUrl.toString(),
				paymentDescription: product.description,
			});

			if (!vippsPayment.ok) {
				return {
					ok: false,
					error: new DownstreamServiceError(
						"Failed to create vipps payment",
						vippsPayment.error,
					),
				};
			}

			const { paymentAttempt } = await productRepository.createPaymentAttempt({
				order: {
					id: order.id,
					version: order.version,
				},
				reference,
			});
			const updatedOrder = await productRepository.updateOrder(
				{
					id: order.id,
				},
				(order) => {
					if (order.paymentStatus === "PENDING") {
						order.paymentStatus = "CREATED";
					}
					return {
						ok: true,
						data: { order },
					};
				},
			);
			if (!updatedOrder.ok) {
				return updatedOrder;
			}

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
				"payment-attempt-polling",
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

		/**
		 * updatePaymentAttemptState checks the remote payment state and updates the payment attempt if necessary.
		 * If the payment attempt has reached a final state, it is removed from the payment processing queue.
		 * If the payment attempt has a new state of "AUTHORIZED", a job is added to the "capture-payment" queue.
		 */
		async updatePaymentAttemptState(
			ctx: Context,
			paymentAttempt: PaymentAttemptType,
		): ResultAsync<
			{ paymentAttempt: PaymentAttemptType },
			NotFoundError | InternalServerError | DownstreamServiceError
		> {
			const { reference } = paymentAttempt;
			if (isFinalPaymentState(paymentAttempt.state)) {
				ctx.log.info({ reference }, "Payment attempt is not in progress");
				return { ok: true, data: { paymentAttempt } };
			}

			const getOrderResult = await productRepository.getOrder(
				paymentAttempt.orderId,
			);
			if (!getOrderResult.ok) {
				return getOrderResult;
			}
			const { order } = getOrderResult.data;
			if (order === null) {
				return {
					ok: false,
					error: new NotFoundError("Order not found"),
				};
			}

			const result = await getRemotePaymentState(ctx, paymentAttempt);
			if (!result.ok) {
				return result;
			}
			const { state: newState } = result.data;
			ctx.log.fatal({ newState, reference });

			let paymentStatus: OrderPaymentStatus = order.paymentStatus;
			if (newState === "AUTHORIZED") {
				if (!order.isFinalState()) {
					paymentStatus = "RESERVED";
				}
			}

			const updatePaymentAttemptResult =
				await productRepository.updatePaymentAttempt(
					{
						id: paymentAttempt.id,
						version: paymentAttempt.version,
						state: newState,
					},
					{
						id: order.id,
						version: order.version,
						paymentStatus,
					},
				);
			if (!updatePaymentAttemptResult.ok) {
				return updatePaymentAttemptResult;
			}
			const { paymentAttempt: updatedPaymentAttempt } =
				updatePaymentAttemptResult.data;

			if (!isFinalPaymentState(updatedPaymentAttempt.state)) {
				ctx.log.info({ reference }, "Payment attempt is still in progress");
				return { ok: true, data: { paymentAttempt: updatedPaymentAttempt } };
			}

			// Stop polling for this payment attempt as we have reached a final state.
			ctx.log.info({ reference }, "payment processed, removing from queue");
			const ok = await paymentProcessingQueue.removeRepeatable(
				"payment-attempt-polling",
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

			if (updatedPaymentAttempt.state === "AUTHORIZED") {
				ctx.log.info(
					{ reference },
					"Payment attempt authorized, capturing payment",
				);
				await paymentProcessingQueue.add("capture-payment", { reference });
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
		): ResultAsync<
			{ paymentAttempt: PaymentAttemptType | null },
			InternalServerError
		> {
			const { reference } = params;
			ctx.log.info({ reference }, "Fetching payment attempt");

			return await productRepository.getPaymentAttempt({
				reference,
			});
		},

		async findMany(
			ctx: Context,
			params?: {
				userId?: string | null;
				productId?: string | null;
				orderId?: string | null;
			} | null,
		): ResultAsync<
			{ paymentAttempts: PaymentAttemptType[]; total: number },
			InternalServerError | PermissionDeniedError | UnauthorizedError
		> {
			if (!ctx.user) {
				return {
					ok: false,
					error: new UnauthorizedError(
						"You must be logged in to get payment attempts",
					),
				};
			}

			if (ctx.user.isSuperUser) {
				return await productRepository.findManyPaymentAttempts(
					params
						? {
								userId: params.userId ?? undefined,
								productId: params.productId ?? undefined,
								orderId: params.orderId ?? undefined,
						  }
						: undefined,
				);
			}

			const { userId, productId, orderId } = params ?? {};
			if (userId && userId !== ctx.user.id) {
				return {
					ok: false,
					error: new PermissionDeniedError(
						"You are not allowed to view payment attempts for other users",
					),
				};
			}

			return await productRepository.findManyPaymentAttempts({
				userId: ctx.user.id,
				productId: productId ?? undefined,
				orderId: orderId ?? undefined,
			});
		},

		async capture(
			ctx: Context,
			{ reference }: { reference: string },
		): ResultAsync<
			{ paymentAttempt: PaymentAttemptType; order: OrderType },
			| NotFoundError
			| InternalServerError
			| InvalidArgumentError
			| DownstreamServiceError
		> {
			const getPaymentAttempt = await productRepository.getPaymentAttempt({
				reference,
			});

			if (!getPaymentAttempt.ok) {
				return getPaymentAttempt;
			}

			const { paymentAttempt } = getPaymentAttempt.data;

			if (paymentAttempt === null) {
				return {
					ok: false,
					error: new NotFoundError("Payment attempt not found"),
				};
			}

			if (paymentAttempt.state !== "AUTHORIZED") {
				return {
					ok: false,
					error: new InvalidArgumentError(
						"Payment attempt must be in state AUTHORIZED to capture",
					),
				};
			}

			const getOrderResult = await productRepository.getOrder(
				paymentAttempt.orderId,
			);
			if (!getOrderResult.ok) {
				return getOrderResult;
			}

			const { order } = getOrderResult.data;
			if (order === null) {
				return {
					ok: false,
					error: new NotFoundError("Order not found"),
				};
			}

			// If the order has already been captured, we should not try to capture it again.
			if (order.paymentStatus === "CAPTURED") {
				return {
					ok: false,
					error: new InvalidArgumentError("Order has already been captured"),
				};
			}
			// If the order is cancelled, we should not try to capture it.
			if (order.paymentStatus === "CANCELLED") {
				return {
					ok: false,
					error: new InvalidArgumentError("Order has been cancelled"),
				};
			}
			// If the order has been refunded, we should not try to capture it.
			if (order.paymentStatus === "REFUNDED") {
				return {
					ok: false,
					error: new InvalidArgumentError("Order has been refunded"),
				};
			}

			const newClientResult = await newClientWithToken(ctx, {
				orderId: order.id,
			});
			if (!newClientResult.ok) {
				return newClientResult;
			}
			const { client, token } = newClientResult.data;
			const response = await client.payment.capture(token, reference, {
				modificationAmount: {
					currency: "NOK",
					value: order.totalPrice,
				},
			});

			if (!response.ok) {
				return {
					ok: false,
					error: new DownstreamServiceError(
						"Failed to capture payment",
						response.error,
					),
				};
			}

			const updateOrder = await productRepository.updateOrder(
				{
					id: order.id,
				},
				(order) => {
					if (order.paymentStatus !== "RESERVED") {
						ctx.log.warn(
							{ order },
							"Order had an unexpected payment status during capture",
						);
					}

					order.paymentStatus = "CAPTURED";
					order.purchasedAt = new Date();
					return {
						ok: true,
						data: { order },
					};
				},
			);

			if (!updateOrder.ok) {
				if (updateOrder.error.name === "InternalServerError") {
					return {
						ok: false,
						error: new InternalServerError(
							`Failed to update order after capturing payment with reference ${reference}`,
							updateOrder.error,
						),
					};
				}
				return updateOrder;
			}

			return {
				ok: true,
				data: {
					paymentAttempt,
					order: updateOrder.data.order,
				},
			};
		},
	} as const;
}

export { buildPayments };

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
	OrderType,
	PaymentAttemptState,
	PaymentAttemptType,
} from "~/domain/products.js";
import type { ResultAsync } from "~/lib/result.js";
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
		by: { id: string } | { orderId: string } | { productId: string },
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
		paymentAttempt: PaymentAttemptType,
		order: OrderType,
	): ResultAsync<
		{ state: PaymentAttemptState },
		InternalServerError | DownstreamServiceError
	> {
		const { reference } = paymentAttempt;
		ctx.log.info({ reference }, "Fetching latest payment status from Vipps");
		const vipps = await newClient({ orderId: order.id });
		if (!vipps.ok) {
			ctx.log.error(
				{ orderId: order.id },
				"Failed to create Vipps client for merchant by order id",
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
			params: { orderId: string },
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

			const getOrderResult = await productRepository.getOrder(params.orderId);
			if (!getOrderResult.ok) {
				return getOrderResult;
			}
			const { order } = getOrderResult.data;
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

			const vipps = await newClient({ orderId: order.id });
			if (!vipps.ok) {
				ctx.log.error(
					{ orderId: order.id },
					"Failed to create Vipps client for merchant by order id",
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
				returnUrl: config.returnUrl,
				paymentDescription: product.description,
			});

			if (!vippsPayment.ok) {
				return {
					ok: false,
					error: new InternalServerError(
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

		async updatePaymentAttemptState(
			ctx: Context,
			paymentAttempt: PaymentAttemptType,
		): ResultAsync<
			{ paymentAttempt: PaymentAttemptType },
			NotFoundError | InternalServerError | DownstreamServiceError
		> {
			const { reference } = paymentAttempt;

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

			const result = await getRemotePaymentState(ctx, paymentAttempt, order);
			if (!result.ok) {
				return result;
			}
			const { state: newState } = result.data;

			let updatedPaymentAttempt = paymentAttempt;
			if (newState !== paymentAttempt.state) {
				const updated = await productRepository.updatePaymentAttempt(
					{
						id: paymentAttempt.id,
						version: paymentAttempt.version,
						state: newState,
					},
					{
						id: order.id,
						version: order.version,
					},
				);
				updatedPaymentAttempt = updated.paymentAttempt;
			}

			if (isFinalPaymentState(newState)) {
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

				if (newState === "AUTHORIZED") {
					ctx.log.info(
						{ reference },
						"Payment attempt authorized, capturing payment",
					);
					await paymentProcessingQueue.add("capture-payment", { reference });
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

			const vipps = await newClient({ orderId: order.id });
			if (!vipps.ok) {
				ctx.log.error(
					{ orderId: order.id },
					"Failed to create Vipps client for merchant by order id",
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

			const updateOrder = await productRepository.updateOrder({
				id: order.id,
				version: order.version,
				paymentStatus: "CAPTURED",
			});

			if (!updateOrder.ok) {
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

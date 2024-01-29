import type { Client } from "@vippsmobilepay/sdk";
import type { Job } from "bullmq";
import { env } from "~/config.js";
import {
	InternalServerError,
	InvalidArgumentError,
	NotFoundError,
	UnauthorizedError,
} from "~/domain/errors.js";
import type {
	Merchant,
	Order,
	OrderPaymentStatus,
	PaymentAttempt,
	PaymentAttemptState,
	Product,
} from "~/domain/products.js";
import type { Result } from "~/lib/result.js";
import type { Context } from "../context.js";
import type {
	PaymentProcessingDataType,
	PaymentProcessingNameType,
	PaymentProcessingQueueType,
	PaymentProcessingResultType,
} from "./worker.js";

export interface ProductRepository {
	getProduct(id: string): Promise<{ product: Product | null }>;
	getOrder(id: string): Promise<{ order: Order | null }>;
	createOrder(order: {
		userId: string;
		product: {
			id: string;
			version: number;
		};
	}): Promise<{ order: Order; product: Product }>;
	createPaymentAttempt(params: {
		order: {
			id: string;
			version: number;
		};
		reference: string;
	}): Promise<{ paymentAttempt: PaymentAttempt; order: Order }>;
	getPaymentAttempt(
		by: { id: string } | { reference: string },
	): Promise<{ paymentAttempt: PaymentAttempt | null }>;
	updatePaymentAttempt(
		paymentAttempt: Pick<PaymentAttempt, "id" | "version" | "state">,
		order: Pick<Order, "id" | "version" | "paymentStatus">,
	): Promise<{ paymentAttempt: PaymentAttempt; order: Order }>;
	getProducts(): Promise<{ products: Product[]; total: number }>;
	createProduct(product: {
		name: string;
		price: number;
		merchantId: string;
	}): Promise<{ product: Product }>;
	createMerchant(merchant: {
		name: string;
		serialNumber: string;
		subscriptionKey: string;
		clientId: string;
		clientSecret: string;
	}): Promise<{ merchant: Merchant }>;
}

export class ProductService {
	constructor(
		private vippsFactory: typeof Client,
		private paymentProcessingQueue: PaymentProcessingQueueType,
		private productRepository: ProductRepository,
		private config?: {
			useTestMode?: boolean;
		},
	) {}

	getPaymentReference(order: Order, attempt: number) {
		return `indok-ntnu-${order.id}-${attempt}`;
	}

	private newClient(merchant: Merchant): ReturnType<typeof Client> {
		return this.vippsFactory({
			merchantSerialNumber: merchant.serialNumber,
			useTestMode: this.config?.useTestMode,
			subscriptionKey: merchant.subscriptionKey,
			retryRequests: false,
		});
	}

	async initiatePaymentAttempt(
		ctx: Context,
		params: { orderId: string },
	): Promise<
		Result<
			{
				redirectUrl: string;
				paymentAttempt: PaymentAttempt;
				order: Order;
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
		>
	> {
		if (!ctx.user) {
			return {
				ok: false,
				error: new UnauthorizedError(
					"You must be logged in to initiate payment",
				),
				message: "You must be logged in to initiate a payment",
			};
		}

		const { order } = await this.productRepository.getOrder(params.orderId);
		if (order === null) {
			return {
				ok: false,
				error: new NotFoundError("Order not found"),
				message: "Order not found",
			};
		}
		if (order.paymentStatus === "CAPTURED") {
			return {
				ok: false,
				error: new InvalidArgumentError("Order has been captured"),
				message: "Order has been captured",
			};
		}
		if (order.paymentStatus === "CANCELLED") {
			return {
				ok: false,
				error: new InvalidArgumentError("Order has been cancelled"),
				message: "Order has been cancelled",
			};
		}
		if (order.paymentStatus === "REFUNDED") {
			return {
				ok: false,
				error: new InvalidArgumentError("Order has been refunded"),
				message: "Order has been refunded",
			};
		}

		const { product } = await this.productRepository.getProduct(
			order?.productId,
		);

		if (product === null) {
			return {
				ok: false,
				error: new NotFoundError("Product not found"),
				message: "Product not found",
			};
		}

		/**
		 * https://developer.vippsmobilepay.com/docs/knowledge-base/orderid
		 *
		 * The order ID must be unique for each order attempt. Recommended to suffix the order ID with a counter to
		 * easily identify multiple attempts for the same order.
		 */
		const reference = this.getPaymentReference(order, order.attempt + 1);

		const vipps = this.newClient(product.merchant);
		ctx.log.info(product.merchant);
		const token = await this.getToken(ctx, vipps, product.merchant);
		const vippsPayment = await vipps.payment.create(token, {
			reference: this.getPaymentReference(order, order.attempt + 1),
			amount: {
				value: product.price,
				currency: "NOK",
			},
			paymentMethod: {
				type: "WALLET",
			},
			userFlow: "WEB_REDIRECT",
			returnUrl: env.SERVER_URL,
			paymentDescription: product.description,
		});

		if (!vippsPayment.ok) {
			const error = new InternalServerError("Failed to create vipps payment");
			error.cause = vippsPayment.error;
			return {
				ok: false,
				error,
				message: "Failed to create Vipps payment.",
			};
		}

		const { paymentAttempt } =
			await this.productRepository.createPaymentAttempt({
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
		const pollingJob = await this.paymentProcessingQueue.add(
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
	}

	private async getToken(
		ctx: Context,
		client: ReturnType<typeof Client>,
		merchant: Merchant,
	): Promise<string> {
		const accessToken = await client.auth.getToken({
			clientId: merchant.clientId,
			clientSecret: merchant.clientSecret,
			subscriptionKey: merchant.subscriptionKey,
		});

		if (!accessToken.ok) {
			ctx.log.error(
				{ message: accessToken.message },
				"Failed to fetch vipps access token",
			);
			const err = new InternalServerError("Failed to fetch vipps access token");
			err.cause = accessToken.error;
			throw err;
		}

		return accessToken.data.access_token;
	}

	private isFinalPaymentState(status: PaymentAttemptState): boolean {
		return (
			status === "FAILED" ||
			status === "TERMINATED" ||
			status === "EXPIRED" ||
			status === "AUTHORIZED"
		);
	}

	private async getRemotePaymentState(
		ctx: Context,
		paymentAttempt: PaymentAttempt,
		order: Order,
	): Promise<Result<{ state: PaymentAttemptState }>> {
		const { reference } = paymentAttempt;
		const { product } = await this.productRepository.getProduct(
			order.productId,
		);
		if (product === null) {
			throw new NotFoundError("Product not found");
		}
		ctx.log.info({ reference }, "Fetching latest payment status from Vipps");
		const vipps = this.newClient(product.merchant);
		const token = await this.getToken(ctx, vipps, product.merchant);
		const response = await vipps.payment.info(token, reference);

		if (!response.ok) {
			ctx.log.error(
				{ reference, message: response.message },
				"Failed to fetch payment status from Vipps",
			);
			const interalErr = new InternalServerError(
				"Failed to fetch payment status from Vipps",
			);
			interalErr.cause = response.error;
			return {
				ok: false,
				error: interalErr,
				message: "Failed to fetch payment status from Vipps",
			};
		}

		return {
			ok: true,
			data: {
				state: response.data.state,
			},
		};
	}

	private paymentAttemptStateToOrderPaymentStatus(
		paymentAttempt: PaymentAttempt,
		order: Order,
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

	async updatePaymentAttemptState(
		ctx: Context,
		paymentAttempt: PaymentAttempt,
	): Promise<Result<{ paymentAttempt: PaymentAttempt }>> {
		const { reference } = paymentAttempt;

		const { order } = await this.productRepository.getOrder(
			paymentAttempt.orderId,
		);
		if (order === null) {
			return {
				ok: false,
				error: new NotFoundError("Order not found"),
				message: "Order not found",
			};
		}

		const result = await this.getRemotePaymentState(ctx, paymentAttempt, order);
		if (!result.ok) {
			return {
				ok: false,
				error: new InternalServerError(
					"Failed to fetch payment status from Vipps",
				),
				message: "Failed to fetch payment status from Vipps",
			};
		}
		const { state: newState } = result.data;

		let updatedPaymentAttempt = paymentAttempt;
		if (newState !== paymentAttempt.state) {
			const orderPaymentStatus = this.paymentAttemptStateToOrderPaymentStatus(
				paymentAttempt,
				order,
			);
			const updated = await this.productRepository.updatePaymentAttempt(
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

		if (this.isFinalPaymentState(newState)) {
			// Stop polling for this payment attempt as we have reached a final state.
			ctx.log.info({ reference }, "payment processed, removing from queue");
			const ok = await this.paymentProcessingQueue.removeRepeatable(
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
	}

	async createProduct(
		ctx: Context,
		data: {
			name: string;
			description?: string | null;
			// price in øre, i.e. 100 = 1 NOK
			price: number;
			merchantId: string;
		},
	): Promise<{ product: Product }> {
		if (!ctx.user) {
			throw new UnauthorizedError("You must be logged in to create a product");
		}

		ctx.log.info({ userId: ctx.user.id }, "Creating product");

		const { product } = await this.productRepository.createProduct({
			name: data.name,
			price: data.price,
			merchantId: data.merchantId,
		});

		ctx.log.info({ userId: ctx.user.id }, "Product created");

		return { product };
	}

	async getPaymentAttempt(
		ctx: Context,
		params: { reference: string },
	): Promise<{ paymentAttempt: PaymentAttempt | null }> {
		const { reference } = params;
		ctx.log.info({ reference }, "Fetching payment attempt");

		const { paymentAttempt } = await this.productRepository.getPaymentAttempt({
			reference,
		});
		return { paymentAttempt };
	}

	async createOrder(
		ctx: Context,
		data: { productId: string },
	): Promise<{ order: Order }> {
		if (!ctx.user) {
			throw new UnauthorizedError("You must be logged in to create an order");
		}

		ctx.log.info(
			{ userId: ctx.user.id, productId: data.productId },
			"Creating order",
		);

		const { product } = await this.productRepository.getProduct(data.productId);
		if (product === null) {
			throw new NotFoundError("Product not found");
		}

		const { order } = await this.productRepository.createOrder({
			userId: ctx.user.id,
			product: product,
		});

		ctx.log.info(
			{ userId: ctx.user.id, productId: data.productId },
			"Order created",
		);

		return { order };
	}

	async getProducts(
		_ctx: Context,
	): Promise<{ products: Product[]; total: number }> {
		const { products, total } = await this.productRepository.getProducts();
		return { products, total };
	}

	async createMerchant(
		ctx: Context,
		data: {
			name: string;
			serialNumber: string;
			subscriptionKey: string;
			clientId: string;
			clientSecret: string;
		},
	): Promise<{ merchant: Merchant }> {
		const { user } = ctx;
		if (!user?.isSuperUser) {
			throw new UnauthorizedError(
				"You must be logged in as a super user to create a merchant",
			);
		}

		const { merchant } = await this.productRepository.createMerchant(data);
		return { merchant };
	}
}

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
	PaymentAttempt,
	PaymentAttemptState,
	Product,
} from "~/domain/products.js";
import type { Context } from "../context.js";
import type {
	PaymentProcessingDataType,
	PaymentProcessingNameType,
	PaymentProcessingQueueType,
	PaymentProcessingResultType,
} from "./worker.js";

export interface ProductRepository {
	getProduct(id: string): Promise<Product | null>;
	getOrder(id: string): Promise<Order | null>;
	createOrder(order: {
		userId: string;
		product: {
			id: string;
			version: number;
		};
	}): Promise<Order>;
	createPaymentAttempt(params: {
		order: {
			id: string;
			version: number;
		};
		reference: string;
	}): Promise<PaymentAttempt>;
	getPaymentAttempt(
		by: { id: string } | { reference: string },
	): Promise<PaymentAttempt | null>;
	updatePaymentAttempt(
		paymentAttempt: { id: string; version: number },
		data: { state: PaymentAttemptState },
	): Promise<PaymentAttempt>;
	getProducts(): Promise<{ products: Product[]; total: number }>;
	createProduct(product: {
		name: string;
		amount: number;
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
	): Promise<{
		redirectUrl: string;
		paymentAttempt: PaymentAttempt;
		order: Order;
		pollingJob: Job<
			PaymentProcessingDataType,
			PaymentProcessingResultType,
			PaymentProcessingNameType
		>;
	}> {
		if (!ctx.user) {
			throw new UnauthorizedError(
				"You must be logged in to initiate a payment attempt",
			);
		}

		const order = await this.productRepository.getOrder(params.orderId);
		if (order === null) {
			throw new NotFoundError("Order not found");
		}
		if (order.paymentStatus === "CAPTURED") {
			throw new InvalidArgumentError("Order has already been captured");
		}
		if (order.paymentStatus === "CANCELLED") {
			throw new InvalidArgumentError("Order has been cancelled");
		}
		if (order.paymentStatus === "REFUNDED") {
			throw new InvalidArgumentError("Order has been refunded");
		}

		const product = await this.productRepository.getProduct(order?.productId);

		if (product === null) {
			throw new NotFoundError("Product not found");
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
				value: product.amount,
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
			throw error;
		}

		const paymentAttempt = await this.productRepository.createPaymentAttempt({
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
			redirectUrl: vippsPayment.data.redirectUrl,
			paymentAttempt,
			order,
			pollingJob,
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

	async updatePaymentAttemptState(
		ctx: Context,
		paymentAttempt: PaymentAttempt,
	): Promise<{ paymentAttempt: PaymentAttempt }> {
		const { reference } = paymentAttempt;

		const order = await this.productRepository.getOrder(paymentAttempt.orderId);
		if (order === null) {
			throw new NotFoundError("Order not found");
		}
		const product = await this.productRepository.getProduct(order.productId);
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
			throw interalErr;
		}

		const status = response.data.state;
		let newState: PaymentAttemptState;
		ctx.log.info({ reference, status }, "Current payment status");

		switch (status) {
			case "ABORTED": {
				newState = "FAILED";
				break;
			}
			case "EXPIRED": {
				newState = "EXPIRED";
				break;
			}
			case "TERMINATED": {
				newState = "TERMINATED";
				break;
			}
			case "CREATED": {
				newState = "CREATED";
				break;
			}
			case "AUTHORIZED": {
				newState = "AUTHORIZED";
				break;
			}
		}

		let updatedPaymentAttempt = paymentAttempt;
		if (newState !== paymentAttempt.state) {
			updatedPaymentAttempt = await this.productRepository.updatePaymentAttempt(
				{
					id: paymentAttempt.id,
					version: paymentAttempt.version,
				},
				{
					state: newState,
				},
			);
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

		return { paymentAttempt: updatedPaymentAttempt };
	}

	async createProduct(
		ctx: Context,
		data: {
			name: string;
			description?: string | null;
			// Amount in øre, i.e. 100 = 1 NOK
			amount: number;
			merchantId: string;
		},
	): Promise<{ product: Product }> {
		if (!ctx.user) {
			throw new UnauthorizedError("You must be logged in to create a product");
		}

		ctx.log.info({ userId: ctx.user.id }, "Creating product");

		const { product } = await this.productRepository.createProduct({
			name: data.name,
			amount: data.amount,
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

		const paymentAttempt = await this.productRepository.getPaymentAttempt({
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

		const product = await this.productRepository.getProduct(data.productId);
		if (product === null) {
			throw new NotFoundError("Product not found");
		}

		const order = await this.productRepository.createOrder({
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

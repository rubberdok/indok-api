import type { Client } from "@vippsmobilepay/sdk";
import {
	InternalServerError,
	InvalidArgumentError,
	NotFoundError,
	UnauthorizedError,
} from "~/domain/errors.js";
import type { Context } from "../context.js";

type Product = {
	id: string;
	amount: number;
	description: string;
	version: number;
};

type Order = {
	id: string;
	productId: string;
	attempt: number;
	version: number;
	/**
	 * PENDING: The order has been created, by no payment attempts have been made
	 * CREATED: A payment attempt has been made, but the user has not yet paid
	 * CAPTURED: The user has paid, and the order has been captured
	 * REFUNDED: The order has been refunded
	 * CANCELLED: The order has been cancelled
	 */
	paymentStatus: "PENDING" | "REFUNDED" | "CANCELLED" | "CREATED" | "CAPTURED";
};

type PaymentAttempt = {
	id: string;
	orderId: string;
	reference: string;
};

interface ProductRepository {
	getProduct(id: string): Promise<Product>;
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
}

export class ProductService {
	constructor(
		private vipps: ReturnType<typeof Client>,

		private productRepository: ProductRepository,
	) {}

	private getPaymentReference(order: Order, attempt: number) {
		return `indok-ntnu-${order.id}-${attempt}`;
	}

	async initiatePaymentAttempt(
		ctx: Context,
		params: { orderId: string },
	): Promise<{
		redirectUrl: string;
		paymentAttempt: PaymentAttempt;
		order: Order;
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

		/**
		 * https://developer.vippsmobilepay.com/docs/knowledge-base/orderid
		 *
		 * The order ID must be unique for each order attempt. Recommended to suffix the order ID with a counter to
		 * easily identify multiple attempts for the same order.
		 */
		const accessToken = await this.vipps.auth.getToken({
			clientId: "",
			clientSecret: "",
			subscriptionKey: "",
		});

		if (!accessToken.ok) {
			throw new InternalServerError("Failed to fetch vipps access token");
		}

		const token = accessToken.data.access_token;
		const reference = this.getPaymentReference(order, order.attempt + 1);
		const vippsPayment = await this.vipps.payment.create(token, {
			reference: this.getPaymentReference(order, order.attempt + 1),
			amount: {
				value: product.amount,
				currency: "NOK",
			},
			paymentMethod: {
				type: "WALLET",
			},
			userFlow: "WEB_REDIRECT",
			returnUrl: "",
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

		return {
			redirectUrl: vippsPayment.data.redirectUrl,
			paymentAttempt,
			order,
		};
	}
}

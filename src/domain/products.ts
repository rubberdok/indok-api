import type {
	Order as PrismaOrder,
	PaymentAttempt as PrismaPaymentAttempt,
} from "@prisma/client";
import { z } from "zod";
import type { Result } from "~/lib/result.js";
import { InvalidArgumentError } from "./errors.js";

/**
 * - CREATED: The payment attempt has been created, but the user has not interacted with it yet.
 *		For example: initiatePaymentAttempt has been called, but the user has not finished the interaction with Vipps yet
 * - TERMINATED: The payment attempt has been terminated by us, for example because the user can no longer pay for the order
 * - EXPIRED: The payment attempt has expired, for example because the user did not pay within the time limit
 */
type PaymentAttemptState =
	| "CREATED"
	| "AUTHORIZED"
	| "FAILED"
	| "TERMINATED"
	| "EXPIRED"
	| "ABORTED";

type OrderPaymentStatus =
	| "PENDING"
	| "CREATED"
	| "CAPTURED"
	| "REFUNDED"
	| "CANCELLED"
	| "RESERVED";

type ProductType = {
	readonly id: string;
	readonly version: number;
	// Price in øre, i.e. 100 = 1 NOK
	price: number;
	name: string;
	description: string;
	merchant: MerchantType;
};

type MerchantType = {
	readonly id: string;
	name: string;
	clientId: string;
	clientSecret: string;
	serialNumber: string;
	subscriptionKey: string;
};

type OrderType = {
	readonly id: string;
	readonly version: number;
	readonly createdAt: Date;
	productId: string;
	attempt: number;
	/**
	 * - PENDING: The order has been created, by no payment attempts have been made
	 * - CREATED: A payment attempt has been made, but the user has not yet paid
	 * - CAPTURED: The user has paid, and the order has been captured
	 * - REFUNDED: The order has been refunded
	 * - CANCELLED: The order has been cancelled
	 */
	paymentStatus: OrderPaymentStatus;
	userId: string | null;
	totalPrice: number;
	/**
	 * The date and time the payment was captured/completed.
	 */
	purchasedAt: Date | null;
	isFinalState: () => boolean;
	/**
	 * The reference of the payment attempt that was used to pay for the order.
	 */
	capturedPaymentAttemptReference: string | null;
};

type PaymentAttemptType = {
	readonly id: string;
	readonly version: number;
	orderId: string;
	reference: string;
	isFinalState: () => boolean;
	state: PaymentAttemptState;
};

class PaymentAttempt implements PaymentAttemptType {
	readonly id: string;
	readonly version: number;
	orderId: string;
	reference: string;
	state: PaymentAttemptState;

	constructor({
		id,
		orderId,
		reference,
		state,
		version,
	}: PrismaPaymentAttempt) {
		this.id = id;
		this.orderId = orderId;
		this.reference = reference;
		this.state = state;
		this.version = version;
	}

	isFinalState() {
		return (
			this.state === "ABORTED" ||
			this.state === "EXPIRED" ||
			this.state === "FAILED" ||
			this.state === "TERMINATED" ||
			this.state === "AUTHORIZED"
		);
	}
}

class Order implements OrderType {
	readonly id: string;
	readonly version: number;
	readonly createdAt: Date;
	productId: string;
	attempt: number;
	paymentStatus: OrderPaymentStatus;
	userId: string | null;
	totalPrice: number;
	purchasedAt: Date | null;
	capturedPaymentAttemptReference: string | null;

	constructor({
		id,
		productId,
		attempt,
		paymentStatus,
		userId,
		totalPrice,
		purchasedAt,
		version,
		createdAt,
		capturedPaymentAttemptReference,
	}: PrismaOrder) {
		this.id = id;
		this.productId = productId;
		this.attempt = attempt;
		this.paymentStatus = paymentStatus;
		this.userId = userId;
		this.totalPrice = totalPrice;
		this.purchasedAt = purchasedAt;
		this.createdAt = createdAt;
		this.version = version;
		this.capturedPaymentAttemptReference = capturedPaymentAttemptReference;
	}

	isFinalState() {
		return (
			this.paymentStatus === "CANCELLED" ||
			this.paymentStatus === "CAPTURED" ||
			this.paymentStatus === "REFUNDED"
		);
	}
}

type NewProductParams = {
	merchantId: string;
	name: string;
	description: string;
	/* Price in øre, i.e. 100 = 1 NOK */
	price: number;
};

type NewProductReturn = Result<
	{
		product: Omit<ProductType, "version" | "id" | "merchant"> & {
			merchantId: string;
		};
	},
	InvalidArgumentError
>;
const Product = {
	new(product: NewProductParams): NewProductReturn {
		const schema = z.object({
			merchantId: z.string().uuid(),
			name: z.string(),
			description: z.string().min(3).max(100),
			price: z.number().int().positive(),
		});

		const result = schema.safeParse(product);
		if (!result.success) {
			return {
				ok: false,
				error: new InvalidArgumentError("Invalid product data", result.error),
			};
		}

		return {
			ok: true,
			data: {
				product: {
					name: result.data.name,
					description: result.data.description,
					price: result.data.price,
					merchantId: result.data.merchantId,
				},
			},
		};
	},
};

export { PaymentAttempt, Product, Order };
export type {
	MerchantType,
	OrderPaymentStatus,
	OrderType,
	PaymentAttemptType,
	PaymentAttemptState,
	ProductType,
};

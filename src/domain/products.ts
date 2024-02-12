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
	id: string;
	// Price in øre, i.e. 100 = 1 NOK
	price: number;
	name: string;
	description: string;
	version: number;
	merchant: MerchantType;
};

type MerchantType = {
	id: string;
	name: string;
	clientId: string;
	clientSecret: string;
	serialNumber: string;
	subscriptionKey: string;
};

type OrderType = {
	id: string;
	productId: string;
	attempt: number;
	version: number;
	/**
	 * - PENDING: The order has been created, by no payment attempts have been made
	 * - CREATED: A payment attempt has been made, but the user has not yet paid
	 * - CAPTURED: The user has paid, and the order has been captured
	 * - REFUNDED: The order has been refunded
	 * - CANCELLED: The order has been cancelled
	 */
	paymentStatus: OrderPaymentStatus;
	userId: string | null;
};

type PaymentAttempt = {
	id: string;
	orderId: string;
	version: number;
	reference: string;
	inProgress: boolean;
	state: PaymentAttemptState;
};

function isInProgress(paymentAttempt: { state: PaymentAttemptState }): boolean {
	return paymentAttempt.state === "CREATED";
}

function PaymentAttemptFromDSO(paymentAttempt: PrismaPaymentAttempt) {
	return {
		id: paymentAttempt.id,
		orderId: paymentAttempt.orderId,
		version: paymentAttempt.version,
		reference: paymentAttempt.reference,
		state: paymentAttempt.state,
		inProgress: isInProgress(paymentAttempt),
	};
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
			description: z.string(),
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

const Order = {
	fromDSO: (order: PrismaOrder): Result<{ order: OrderType }, never> => {
		return {
			ok: true,
			data: {
				order: {
					id: order.id,
					productId: order.productId,
					attempt: order.attempt,
					version: order.version,
					paymentStatus: order.paymentStatus,
					userId: order.userId,
				},
			},
		};
	},
};

export { PaymentAttemptFromDSO, Product, Order };
export type {
	MerchantType,
	NewProductParams,
	NewProductReturn,
	OrderPaymentStatus,
	OrderType,
	PaymentAttempt,
	PaymentAttemptState,
	ProductType,
};

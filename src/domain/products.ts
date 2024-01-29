import type { PaymentAttempt as PrismaPaymentAttempt } from "@prisma/client";

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

type Product = {
	id: string;
	// Price in øre, i.e. 100 = 1 NOK
	price: number;
	description: string;
	version: number;
	merchant: Merchant;
};

type Merchant = {
	id: string;
	name: string;
	clientId: string;
	clientSecret: string;
	serialNumber: string;
	subscriptionKey: string;
};

type Order = {
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
};

type PaymentAttempt = {
	id: string;
	orderId: string;
	version: number;
	reference: string;
	inProgress: boolean;
	state: PaymentAttemptState;
};

export type {
	Product,
	Order,
	PaymentAttempt,
	OrderPaymentStatus,
	PaymentAttemptState,
	Merchant,
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

export { PaymentAttemptFromDSO };

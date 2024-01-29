import type { PrismaClient } from "@prisma/client";
import {
	type Merchant,
	type Order,
	type PaymentAttempt,
	PaymentAttemptFromDSO,
	type PaymentAttemptState,
	type Product,
} from "~/domain/products.js";

export class ProductRepository {
	constructor(private db: PrismaClient) {}

	async createMerchant(merchant: {
		name: string;
		clientSecret: string;
		clientId: string;
		serialNumber: string;
		subscriptionKey: string;
	}): Promise<{ merchant: Merchant }> {
		const created = await this.db.merchant.create({
			data: merchant,
		});
		return { merchant: created };
	}

	async updateMerchant(
		merchant: Partial<{
			name: string;
			clientSecret: string;
			clientId: string;
			serialNumber: string;
			subscriptionKey: string;
		}> & { id: string },
	) {
		return await this.db.merchant.update({
			where: {
				id: merchant.id,
			},
			data: merchant,
		});
	}

	async createOrder(order: {
		userId: string;
		product: {
			id: string;
			version: number;
		};
	}): Promise<Order> {
		const { userId, product } = order;
		const orderPromise = this.db.order.create({
			data: {
				userId,
				productId: product.id,
			},
		});
		const productPromise = this.db.product.update({
			where: {
				id: product.id,
				version: product.version,
			},
			data: {
				remainingQuantity: {
					decrement: 1,
				},
				version: {
					increment: 1,
				},
			},
		});

		const [orderResult] = await this.db.$transaction([
			orderPromise,
			productPromise,
		]);
		return orderResult;
	}

	/**
	 * createPaymentAttempt creates a payment attempt for an order, and increments the order's attempt counter.
	 */
	async createPaymentAttempt(paymentAttempt: {
		order: {
			id: string;
			version: number;
		};
		reference: string;
	}): Promise<PaymentAttempt> {
		const { reference, order } = paymentAttempt;
		const paymentAttemptPromise = this.db.paymentAttempt.create({
			data: {
				orderId: order.id,
				reference,
			},
		});
		const orderPromise = this.db.order.update({
			where: {
				id: order.id,
				version: order.version,
			},
			data: {
				attempt: {
					increment: 1,
				},
				version: {
					increment: 1,
				},
			},
		});

		/**
		 * Wrap the promises in a transaction so that we can be sure that the order's attempt counter is incremented
		 * if the payment attempt is created.
		 */
		const [paymentAttemptResult] = await this.db.$transaction([
			paymentAttemptPromise,
			orderPromise,
		]);

		return PaymentAttemptFromDSO(paymentAttemptResult);
	}

	getProduct(id: string): Promise<Product | null> {
		return this.db.product.findUnique({
			include: {
				merchant: true,
			},
			where: {
				id,
			},
		});
	}

	getOrder(id: string): Promise<Order | null> {
		return this.db.order.findUnique({
			where: {
				id,
			},
		});
	}

	async getPaymentAttempt(
		by: { id: string } | { reference: string },
	): Promise<PaymentAttempt | null> {
		const attempt = await this.db.paymentAttempt.findUnique({
			where: by,
		});
		if (!attempt) {
			return null;
		}
		return PaymentAttemptFromDSO(attempt);
	}

	async updatePaymentAttempt(
		paymentAttempt: { id: string; version: number },
		data: { state: PaymentAttemptState },
	): Promise<PaymentAttempt> {
		const updated = await this.db.paymentAttempt.update({
			where: {
				id: paymentAttempt.id,
				version: paymentAttempt.version,
			},
			data: {
				state: data.state,
				version: {
					increment: 1,
				},
			},
		});

		return PaymentAttemptFromDSO(updated);
	}

	async getProducts(): Promise<{ products: Product[]; total: number }> {
		const [products, count] = await this.db.$transaction([
			this.db.product.findMany({
				include: {
					merchant: true,
				},
			}),
			this.db.product.count(),
		]);
		return { products, total: count };
	}

	async createProduct(product: {
		name: string;
		amount: number;
		merchantId: string;
	}): Promise<{ product: Product }> {
		const created = await this.db.product.create({
			include: {
				merchant: true,
			},
			data: product,
		});
		return { product: created };
	}
}

import type { PrismaClient } from "@prisma/client";

export class ProductRepository {
	constructor(private db: PrismaClient) {}

	async createMerchant(merchant: {
		name: string;
		secretKey: string;
	}) {
		return await this.db.merchant.create({
			data: merchant,
		});
	}

	async updateMerchant(
		merchant: Partial<{
			name: string;
			secretKey: string;
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
	}) {
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

	async initiatePaymentAttempt(paymentAttempt: {
		orderId: string;
	}) {
		const paymentAttemptPromise = this.db.paymentAttempt.create({
			data: {
				orderId: paymentAttempt.orderId,
				status: "INITIATED",
			},
		});
		const orderPromise = this.db.order.update({
			where: {
				id: paymentAttempt.orderId,
			},
			data: {
				status: "INITIATED",
			},
		});
		const [paymentAttemptResult] = await this.db.$transaction([
			paymentAttemptPromise,
			orderPromise,
		]);
		return paymentAttemptResult;
	}
}

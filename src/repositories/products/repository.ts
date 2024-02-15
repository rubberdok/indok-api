import type { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";
import { pick } from "lodash-es";
import {
	InternalServerError,
	InvalidArgumentError,
	NotFoundError,
} from "~/domain/errors.js";
import {
	type MerchantType,
	Order,
	type OrderType,
	PaymentAttempt,
	type PaymentAttemptType,
	type ProductType,
} from "~/domain/products.js";
import { prismaKnownErrorCodes } from "~/lib/prisma.js";
import type { Result, ResultAsync } from "~/lib/result.js";

export class ProductRepository {
	constructor(private db: PrismaClient) {}

	/**
	 * createMerchant creates a merchant.
	 *
	 * @throws {InvalidArgumentError} if a merchant with the same clientId already exists.
	 */
	async createMerchant(merchant: {
		name: string;
		clientSecret: string;
		clientId: string;
		serialNumber: string;
		subscriptionKey: string;
	}): Promise<{ merchant: MerchantType }> {
		try {
			const created = await this.db.merchant.create({
				data: merchant,
			});
			return { merchant: created };
		} catch (err) {
			if (err instanceof PrismaClientKnownRequestError) {
				if (
					err.code === prismaKnownErrorCodes.ERR_UNIQUE_CONSTRAINT_VIOLATION
				) {
					throw new InvalidArgumentError(
						"A merchant with this clientId already exists",
					);
				}
			}
			throw err;
		}
	}

	/**
	 * updateMerchant updates a merchant.
	 * @throws {InvalidArgumentError} if a merchant with the same clientId already exists.
	 */
	async updateMerchant(
		merchant: Partial<{
			name: string;
			clientSecret: string;
			clientId: string;
			serialNumber: string;
			subscriptionKey: string;
		}> & { id: string },
	): Promise<{ merchant: MerchantType }> {
		try {
			const updated = await this.db.merchant.update({
				where: {
					id: merchant.id,
				},
				data: merchant,
			});
			return { merchant: updated };
		} catch (err) {
			if (err instanceof PrismaClientKnownRequestError) {
				if (
					err.code === prismaKnownErrorCodes.ERR_UNIQUE_CONSTRAINT_VIOLATION
				) {
					throw new InvalidArgumentError(
						"A merchant with this clientId already exists",
					);
				}
			}
			throw err;
		}
	}

	/**
	 * createOrder creates an order for a product, and decrements the product's remaining quantity.
	 *
	 */
	async createOrder(order: {
		userId: string;
		product: {
			id: string;
			version: number;
		};
		totalPrice: number;
	}): Promise<{ order: OrderType; product: ProductType }> {
		const { userId, product, totalPrice } = order;
		const orderPromise = this.db.order.create({
			data: {
				totalPrice,
				userId,
				productId: product.id,
			},
		});
		const productPromise = this.db.product.update({
			include: {
				merchant: true,
			},
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
		try {
			const [orderResult, productResult] = await this.db.$transaction([
				orderPromise,
				productPromise,
			]);
			return { order: new Order(orderResult), product: productResult };
		} catch (err) {
			if (err instanceof PrismaClientKnownRequestError) {
				if (err.code === prismaKnownErrorCodes.ERR_NOT_FOUND) {
					throw new NotFoundError(`
						ProductType could not be found.
						This is either because the product does not exist,
						or someone else has updated the product in the meantime,
						or the product is out of stock.
					`);
				}
			}
			throw err;
		}
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
	}): Promise<{ paymentAttempt: PaymentAttemptType; order: OrderType }> {
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
				paymentStatus: "CREATED",
				attempt: {
					increment: 1,
				},
				version: {
					increment: 1,
				},
			},
		});

		try {
			/**
			 * Wrap the promises in a transaction so that we can be sure that the order's attempt counter is incremented
			 * if the payment attempt is created.
			 */
			const [paymentAttemptResult, orderResult] = await this.db.$transaction([
				paymentAttemptPromise,
				orderPromise,
			]);

			return {
				paymentAttempt: new PaymentAttempt(paymentAttemptResult),
				order: new Order(orderResult),
			};
		} catch (err) {
			if (err instanceof PrismaClientKnownRequestError) {
				if (err.code === prismaKnownErrorCodes.ERR_NOT_FOUND) {
					throw new NotFoundError(`
						OrderType could not be found.
						This is either because the order does not exist,
						or someone else has updated the order in the meantime.
					`);
				}
			}
			throw err;
		}
	}

	/**
	 * getProduct returns a product.
	 */
	async getProduct(id: string): Promise<{ product: ProductType | null }> {
		const product = await this.db.product.findUnique({
			include: {
				merchant: true,
			},
			where: {
				id,
			},
		});
		return { product };
	}

	/**
	 * getOrder returns an order.
	 */
	async getOrder(
		id: string,
	): ResultAsync<{ order: OrderType | null }, InternalServerError> {
		try {
			const order = await this.db.order.findUnique({
				where: {
					id,
				},
			});
			if (order === null) {
				return {
					ok: true,
					data: { order: null },
				};
			}
			return {
				ok: true,
				data: { order: new Order(order) },
			};
		} catch (err) {
			return {
				ok: false,
				error: new InternalServerError("Failed to get order", err),
			};
		}
	}

	/**
	 * getPamentAttempt returns a payment attempt.
	 */
	async getPaymentAttempt(
		by: { id: string } | { reference: string },
	): ResultAsync<
		{ paymentAttempt: PaymentAttemptType | null },
		InternalServerError
	> {
		try {
			const attempt = await this.db.paymentAttempt.findUnique({
				where: by,
			});
			if (!attempt) {
				return { data: { paymentAttempt: null }, ok: true };
			}
			return {
				data: { paymentAttempt: new PaymentAttempt(attempt) },
				ok: true,
			};
		} catch (err) {
			return {
				ok: false,
				error: new InternalServerError(
					"Unexpected error getting payment attempt",
					err,
				),
			};
		}
	}

	/**
	 * updatePaymentAttempt updates a payment attempt.
	 */
	async updatePaymentAttempt(
		paymentAttempt: Pick<PaymentAttemptType, "state" | "id" | "version">,
		order: Pick<OrderType, "id" | "version" | "paymentStatus">,
	): ResultAsync<
		{ paymentAttempt: PaymentAttemptType; order: OrderType },
		NotFoundError | InternalServerError
	> {
		const paymentAttemptPromise = this.db.paymentAttempt.update({
			where: {
				id: paymentAttempt.id,
				version: paymentAttempt.version,
			},
			data: {
				state: paymentAttempt.state,
				version: {
					increment: 1,
				},
			},
		});
		const orderPromise = this.db.order.update({
			where: {
				id: order.id,
				version: order.version,
			},
			data: {
				paymentStatus: order.paymentStatus,
				version: {
					increment: 1,
				},
			},
		});

		try {
			const [updatedPaymentAttempt, updatedOrder] = await this.db.$transaction([
				paymentAttemptPromise,
				orderPromise,
			]);

			return {
				ok: true,
				data: {
					paymentAttempt: new PaymentAttempt(updatedPaymentAttempt),
					order: new Order(updatedOrder),
				},
			};
		} catch (err) {
			if (err instanceof PrismaClientKnownRequestError) {
				if (err.code === prismaKnownErrorCodes.ERR_NOT_FOUND) {
					return {
						ok: false,
						error: new NotFoundError(
							`
							Payment attempt could not be found.
							This is either because the payment attempt does not exist,
							or someone else has updated the payment attempt in the meantime.
						`,
							err,
						),
					};
				}
			}
			return {
				ok: false,
				error: new InternalServerError("Failed to update payment attempt", err),
			};
		}
	}

	/**
	 * getProduct returns a product.
	 */
	async getProducts(): Promise<{ products: ProductType[]; total: number }> {
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

	/**
	 * createProduct creates a product.
	 */
	async createProduct(product: {
		name: string;
		price: number;
		merchantId: string;
	}): Promise<{ product: ProductType }> {
		const created = await this.db.product.create({
			include: {
				merchant: true,
			},
			data: product,
		});
		return { product: created };
	}

	/**
	 * findManyOrders returns orders for a user, product, or a combination of the two.
	 */
	async findManyOrders(params?: {
		userId?: string;
		productId?: string;
	}): ResultAsync<{ orders: OrderType[]; total: number }, InternalServerError> {
		const { userId, productId } = params ?? {};
		const [count, orders] = await this.db.$transaction([
			this.db.order.count({
				where: {
					userId,
					productId,
				},
			}),
			this.db.order.findMany({
				where: {
					userId,
					productId,
				},
			}),
		]);

		return {
			ok: true,
			data: {
				orders: orders.map((order) => new Order(order)),
				total: count,
			},
		};
	}

	/**
	 * findManyPaymentAttempts returns payment attempts for a user, order, or product, or a combination of the three
	 */
	async findManyPaymentAttempts(params?: {
		userId?: string;
		orderId?: string;
		productId?: string;
	}): ResultAsync<
		{ paymentAttempts: PaymentAttemptType[]; total: number },
		InternalServerError
	> {
		const { userId, orderId, productId } = params ?? {};
		const [count, paymentAttemptsFromDSO] = await this.db.$transaction([
			this.db.paymentAttempt.count({
				where: {
					order: {
						id: orderId,
						userId: userId,
						productId: productId,
					},
				},
			}),
			this.db.paymentAttempt.findMany({
				where: {
					order: {
						id: orderId,
						userId: userId,
						productId: productId,
					},
				},
			}),
		]);
		const paymentAttempts: PaymentAttemptType[] = [];
		for (const paymentAttempt of paymentAttemptsFromDSO) {
			paymentAttempts.push(new PaymentAttempt(paymentAttempt));
		}

		return {
			ok: true,
			data: {
				paymentAttempts: paymentAttempts,
				total: count,
			},
		};
	}

	async updateOrder(
		params: {
			id: string;
		},
		updateFn: (order: OrderType) => Result<{ order: OrderType }, never>,
	): ResultAsync<{ order: OrderType }, NotFoundError | InternalServerError> {
		const getOrder = await this.getOrder(params.id);
		if (!getOrder.ok) {
			return getOrder;
		}
		const { order } = getOrder.data;
		if (order === null) {
			return {
				ok: false,
				error: new NotFoundError("Order not found"),
			};
		}

		const updateResult = updateFn(order);
		if (!updateResult.ok) {
			return updateResult;
		}
		const { order: updatedOrder } = updateResult.data;
		const updateFields = pick(updatedOrder, [
			"paymentStatus",
			"version",
			"attempt",
			"totalPrice",
			"purchasedAt",
		]);
		try {
			const orderAfterUpdate = await this.db.order.update({
				where: {
					id: order.id,
					version: order.version,
				},
				data: {
					...updateFields,
					version: {
						increment: 1,
					},
				},
			});
			return {
				ok: true,
				data: { order: new Order(orderAfterUpdate) },
			};
		} catch (err) {
			if (err instanceof PrismaClientKnownRequestError) {
				if (err.code === prismaKnownErrorCodes.ERR_NOT_FOUND) {
					return {
						ok: false,
						error: new NotFoundError("Order not found"),
					};
				}
			}
			return {
				ok: false,
				error: new InternalServerError("Failed to update order", err),
			};
		}
	}

	async getMerchant(
		by: { merchantId: string } | { orderId: string } | { productId: string },
	): ResultAsync<
		{ merchant: MerchantType },
		NotFoundError | InternalServerError
	> {
		let merchant: MerchantType | null = null;
		try {
			if ("merchantId" in by) {
				merchant = await this.db.merchant.findUnique({
					where: {
						id: by.merchantId,
					},
				});
			} else if ("orderId" in by) {
				merchant = await this.db.merchant.findFirst({
					where: {
						products: {
							some: {
								orders: {
									some: {
										id: by.orderId,
									},
								},
							},
						},
					},
				});
			} else if ("productId" in by) {
				merchant = await this.db.merchant.findFirst({
					where: {
						products: {
							some: {
								id: by.productId,
							},
						},
					},
				});
			}
			if (merchant === null) {
				return {
					ok: false,
					error: new NotFoundError("Merchant not found"),
				};
			}

			return {
				ok: true,
				data: { merchant },
			};
		} catch (err) {
			return {
				ok: false,
				error: new InternalServerError(
					"Unexpected error getting merchant",
					err,
				),
			};
		}
	}
}

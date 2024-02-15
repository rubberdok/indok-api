import type { OrderResolvers } from "./../../types.generated.js";
export const Order: OrderResolvers = {
	/* Implement Order resolver logic here */
	product: async (order, _args, ctx) => {
		const getProductResult = await ctx.products.products.get(ctx, {
			id: order.productId,
		});
		if (!getProductResult.ok) {
			throw getProductResult.error;
		}
		return getProductResult.data.product;
	},
	user: (order, _args, ctx) => {
		if (ctx.user && order.userId === ctx.user.id) {
			return ctx.user;
		}
		return null;
	},
	totalPrice: ({ totalPrice }) => {
		return {
			value: totalPrice,
			unit: "Øre (NOK)",
		};
	},
	paymentAttempt: async (_parent, { reference }, ctx) => {
		if (!reference) return null;
		const paymentAttemptResult = await ctx.products.payments.get(ctx, {
			reference,
		});
		if (!paymentAttemptResult.ok) {
			throw paymentAttemptResult.error;
		}
		return paymentAttemptResult.data.paymentAttempt;
	},
	isFinalState: (order) => {
		return order.isFinalState();
	},
	paymentAttempts: async (order, _args, ctx) => {
		const findManyPaymentsResult = await ctx.products.payments.findMany(ctx, {
			orderId: order.id,
		});
		if (!findManyPaymentsResult.ok) {
			if (findManyPaymentsResult.error.name === "UnauthorizedError")
				return { paymentAttempts: [], total: 0 };
			throw findManyPaymentsResult.error;
		}
		return findManyPaymentsResult.data;
	},
	capturedPaymentAttempt: async (
		{ capturedPaymentAttemptReference },
		_args,
		ctx,
	) => {
		if (!capturedPaymentAttemptReference) return null;
		const getPaymentAttemptResult = await ctx.products.payments.get(ctx, {
			reference: capturedPaymentAttemptReference,
		});
		if (!getPaymentAttemptResult.ok) {
			throw getPaymentAttemptResult.error;
		}
		return getPaymentAttemptResult.data.paymentAttempt;
	},
};

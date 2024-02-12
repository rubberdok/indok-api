import type { PaymentAttemptResolvers } from "./../../types.generated.js";
export const PaymentAttempt: PaymentAttemptResolvers = {
	/* Implement PaymentAttempt resolver logic here */
	order: async (paymentAttempt, _args, ctx) => {
		const getOrderResult = await ctx.products.orders.get(ctx, {
			id: paymentAttempt.orderId,
		});
		if (!getOrderResult.ok) {
			throw getOrderResult.error;
		}
		return getOrderResult.data.order;
	},
};

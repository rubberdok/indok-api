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
		if (order.userId === ctx.user?.id) {
			return ctx.user;
		}
		return null;
	},
};

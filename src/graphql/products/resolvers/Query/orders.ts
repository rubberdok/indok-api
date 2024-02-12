import type { QueryResolvers } from "./../../../types.generated.js";
export const orders: NonNullable<QueryResolvers["orders"]> = async (
	_parent,
	{ data },
	ctx,
) => {
	const findManyOrdersResult = await ctx.products.orders.findMany(ctx, data);

	if (!findManyOrdersResult.ok) {
		throw findManyOrdersResult.error;
	}

	return {
		orders: findManyOrdersResult.data.orders,
		total: findManyOrdersResult.data.total,
	};
};

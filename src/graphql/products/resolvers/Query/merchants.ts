import type { QueryResolvers } from "./../../../types.generated.js";
export const merchants: NonNullable<QueryResolvers["merchants"]> = async (
	_parent,
	_arg,
	ctx,
) => {
	const findManyMerchantsResult = await ctx.products.merchants.findMany(ctx);
	if (!findManyMerchantsResult.ok) {
		throw findManyMerchantsResult.error;
	}
	return findManyMerchantsResult.data;
};

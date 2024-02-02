import type { QueryResolvers } from "./../../../types.generated.js";
export const products: NonNullable<QueryResolvers["products"]> = async (
	_parent,
	_arg,
	ctx,
) => {
	const productsResult = await ctx.products.products.findMany(ctx);
	if (!productsResult.ok) {
		throw productsResult.error;
	}
	return productsResult.data;
};

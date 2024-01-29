import type { QueryResolvers } from "./../../../types.generated.js";
export const products: NonNullable<QueryResolvers["products"]> = async (
	_parent,
	_arg,
	ctx,
) => {
	const { products, total } = await ctx.products.getProducts(ctx);
	return { products, total };
};

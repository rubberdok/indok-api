import type { QueryResolvers } from "./../../../types.generated.js";
export const categories: NonNullable<QueryResolvers["categories"]> = async (
	_parent,
	_arg,
	ctx,
) => {
	const categories = await ctx.events.getCategories(ctx);
	return { categories };
};

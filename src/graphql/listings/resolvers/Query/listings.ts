import type { QueryResolvers } from "./../../../types.generated.js";
export const listings: NonNullable<QueryResolvers["listings"]> = async (
	_parent,
	_arg,
	ctx,
) => {
	const listings = await ctx.listings.findMany();
	return { listings };
};

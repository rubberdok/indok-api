import type { QueryResolvers } from "./../../../types.generated.js";
export const cabins: NonNullable<QueryResolvers['cabins']> = async (
	_parent,
	_args,
	ctx,
) => {
	const cabins = await ctx.cabins.findManyCabins();
	return { cabins };
};

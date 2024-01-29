import type { QueryResolvers } from "./../../../types.generated.js";
export const listing: NonNullable<QueryResolvers["listing"]> = async (
	_parent,
	{ data },
	ctx,
) => {
	const listing = await ctx.listings.get(data.id);
	return { listing };
};

import type { MutationResolvers } from "./../../../types.generated.js";
export const updateEventCategory: NonNullable<
	MutationResolvers["updateEventCategory"]
> = async (_parent, { data }, ctx) => {
	const category = await ctx.events.updateCategory(ctx, data);
	return { category };
};

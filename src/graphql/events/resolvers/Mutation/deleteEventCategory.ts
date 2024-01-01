import type { MutationResolvers } from "./../../../types.generated.js";
export const deleteEventCategory: NonNullable<
	MutationResolvers["deleteEventCategory"]
> = async (_parent, { data }, ctx) => {
	const category = await ctx.eventService.deleteCategory(ctx, data);
	return { category };
};

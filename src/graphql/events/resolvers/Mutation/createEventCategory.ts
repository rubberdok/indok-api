import type { MutationResolvers } from "./../../../types.generated.js";
export const createEventCategory: NonNullable<
	MutationResolvers["createEventCategory"]
> = async (_parent, { data }, ctx) => {
	const category = await ctx.eventService.createCategory(ctx, data);
	return { category };
};

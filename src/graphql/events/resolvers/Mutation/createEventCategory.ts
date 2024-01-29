import type { MutationResolvers } from "./../../../types.generated.js";
export const createEventCategory: NonNullable<
	MutationResolvers["createEventCategory"]
> = async (_parent, { data }, ctx) => {
	const category = await ctx.events.createCategory(ctx, data);
	return { category };
};

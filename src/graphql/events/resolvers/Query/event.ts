import type { QueryResolvers } from "./../../../types.generated.js";
export const event: NonNullable<QueryResolvers["event"]> = async (
	_parent,
	{ data },
	ctx,
) => {
	const event = await ctx.events.get(data.id);
	return { event };
};

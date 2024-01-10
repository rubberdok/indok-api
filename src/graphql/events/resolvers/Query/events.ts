import type { QueryResolvers } from "./../../../types.generated.js";

export const events: NonNullable<QueryResolvers['events']> = async (
	_parent,
	{ data },
	ctx,
) => {
	if (!data) {
		const events = await ctx.events.findMany();
		return { events };
	}

	const filter: Parameters<typeof ctx.events.findMany>[0] = {
		onlyFutureEvents: data.futureEventsOnly,
	};

	const events = await ctx.events.findMany(filter);
	return { events };
};

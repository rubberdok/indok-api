import type { QueryResolvers } from "./../../../types.generated.js";

export const events: NonNullable<QueryResolvers["events"]> = async (
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
		organizations: data.organizations,
		categories: data.categories,
		endBefore: data.endBefore,
		startAfter: data.startAfter,
	};

	const events = await ctx.events.findMany(filter);
	return { events };
};

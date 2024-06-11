import type { MutationResolvers } from "./../../../types.generated.js";
export const updateEvent: NonNullable<
	MutationResolvers["updateEvent"]
> = async (_parent, { data, id }, ctx) => {
	const {
		name,
		description,
		startAt,
		endAt,
		location,
		capacity,
		categories,
		slots,
	} = data;
	const updateEventResult = await ctx.events.update(ctx, {
		event: {
			id,
			name,
			description,
			startAt: typeof startAt === "string" ? new Date(startAt) : startAt,
			endAt: typeof endAt === "string" ? new Date(endAt) : endAt,
			location,
			capacity,
		},
		categories,
		slots,
	});

	if (!updateEventResult.ok) {
		throw updateEventResult.error;
	}

	const { event } = updateEventResult.data;

	return {
		event,
	};
};

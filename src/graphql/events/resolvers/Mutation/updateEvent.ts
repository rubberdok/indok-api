import type { MutationResolvers } from "./../../../types.generated.js";
export const updateEvent: NonNullable<MutationResolvers["updateEvent"]> =
	async (_parent, { data, id }, ctx) => {
		const { categories, slots, ...rest } = data;
		const updateEventResult = await ctx.events.update(ctx, {
			event: {
				id,
				...rest,
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

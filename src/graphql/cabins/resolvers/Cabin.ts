import type { CabinResolvers } from "./../../types.generated.js";
export const Cabin: CabinResolvers = {
	/* Implement Cabin resolver logic here */
	occupiedDays: async ({ id }, _args, ctx) => {
		const occupiedDates = await ctx.cabins.getOccupiedDates(ctx, {
			cabinId: id,
		});
		if (!occupiedDates.ok) {
			throw occupiedDates.error;
		}

		return occupiedDates.data.days;
	},
};

import type { QueryResolvers } from "./../../../types.generated.js";
export const getAvailabilityCalendar: NonNullable<
	QueryResolvers["getAvailabilityCalendar"]
> = async (_parent, { data }, ctx) => {
	const getAvailabilityCalendarResult =
		await ctx.cabins.getAvailabilityCalendar(ctx, data);
	if (!getAvailabilityCalendarResult.ok) {
		throw getAvailabilityCalendarResult.error;
	}

	return getAvailabilityCalendarResult.data;
};

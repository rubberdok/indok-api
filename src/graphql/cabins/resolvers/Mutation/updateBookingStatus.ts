import type { MutationResolvers } from "./../../../types.generated.js";
export const updateBookingStatus: NonNullable<
	MutationResolvers["updateBookingStatus"]
> = async (_parent, { data }, ctx) => {
	const { id, status, feedback } = data;
	const updateBookingStatusResult = await ctx.cabins.updateBookingStatus(ctx, {
		bookingId: id,
		status,
		feedback,
	});
	if (!updateBookingStatusResult.ok) {
		throw updateBookingStatusResult.error;
	}
	const { booking } = updateBookingStatusResult.data;
	return { booking };
};

import type { MutationResolvers } from "./../../../types.generated.js";
export const newBooking: NonNullable<MutationResolvers["newBooking"]> = async (
	_parent,
	{ data },
	ctx,
) => {
	const {
		cabins,
		startDate,
		endDate,
		email,
		firstName,
		lastName,
		phoneNumber,
		internalParticipantsCount,
		externalParticipantsCount,
		questions,
	} = data;

	const newBookingResult = await ctx.cabins.newBooking(ctx, {
		cabins,
		startDate,
		endDate,
		email,
		firstName,
		lastName,
		phoneNumber,
		internalParticipantsCount,
		externalParticipantsCount,
		questions,
	});

	if (!newBookingResult.ok) {
		throw newBookingResult.error;
	}
	const { booking } = newBookingResult.data;
	return { booking };
};

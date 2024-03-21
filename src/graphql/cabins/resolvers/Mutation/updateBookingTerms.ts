import type { MutationResolvers } from "./../../../types.generated.js";
export const updateBookingTerms: NonNullable<
	MutationResolvers["updateBookingTerms"]
> = async (_parent, _arg, ctx) => {
	const result = await ctx.cabins.updateBookingTerms(ctx);
	if (!result.ok) {
		throw result.error;
	}
	return {
		bookingTerms: result.data.bookingTerms,
		uploadUrl: result.data.uploadUrl,
	};
};

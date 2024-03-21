import type { QueryResolvers } from "./../../../types.generated.js";
export const bookingTerms: NonNullable<QueryResolvers["bookingTerms"]> = async (
	_parent,
	_arg,
	ctx,
) => {
	const result = await ctx.cabins.getBookingTerms(ctx);
	if (!result.ok) {
		switch (result.error.code) {
			case "NOT_FOUND":
				return { bookingTerms: null };
			default:
				throw result.error;
		}
	}
	return { bookingTerms: result.data.bookingTerms };
};

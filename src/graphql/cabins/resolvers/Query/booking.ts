import type { QueryResolvers } from "./../../../types.generated.js";
export const booking: NonNullable<QueryResolvers["booking"]> = async (
	_parent,
	{ data },
	ctx,
) => {
	const getBookingResult = await ctx.cabins.getBookingByIdAndEmail(ctx, data);
	if (!getBookingResult.ok) {
		switch (getBookingResult.error.name) {
			case "InternalServerError":
				throw getBookingResult.error;
			case "NotFoundError":
				return {
					booking: null,
				};
		}
	}
	return getBookingResult.data;
};

import type { QueryResolvers } from "./../../../types.generated.js";
export const bookings: NonNullable<QueryResolvers["bookings"]> = async (
	_parent,
	{ data },
	ctx,
) => {
	const result = await ctx.cabins.findManyBookings(ctx, {
		bookingStatus: data?.status,
	});

	if (!result.ok) {
		switch (result.error.name) {
			case "PermissionDeniedError":
			case "UnauthorizedError":
				return {
					bookings: [],
					total: 0,
				};
			case "InternalServerError":
				throw result.error;
		}
	}
	return {
		bookings: result.data.bookings,
		total: result.data.total,
	};
};

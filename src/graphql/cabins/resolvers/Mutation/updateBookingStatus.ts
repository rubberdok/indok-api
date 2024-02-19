import { assertIsAuthenticated } from "~/graphql/auth.js";
import type { MutationResolvers } from "./../../../types.generated.js";
export const updateBookingStatus: NonNullable<
	MutationResolvers["updateBookingStatus"]
> = async (_parent, { data }, ctx) => {
	assertIsAuthenticated(ctx);
	const { id, status } = data;
	const updateBookingStatusResult = await ctx.cabins.updateBookingStatus(
		ctx,
		id,
		status,
	);
	if (!updateBookingStatusResult.ok) {
		throw updateBookingStatusResult.error;
	}
	const { booking } = updateBookingStatusResult.data;
	return { booking };
};

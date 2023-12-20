import { assertIsAuthenticated } from "~/graphql/auth.js";
import type { MutationResolvers } from "./../../../types.generated.js";
export const updateBookingSemester: NonNullable<
	MutationResolvers["updateBookingSemester"]
> = async (_parent, { data }, ctx) => {
	assertIsAuthenticated(ctx);

	const {
		startAt: rawStartAt,
		endAt: rawEndAt,
		semester,
		bookingsEnabled,
	} = data;
	const startAt = rawStartAt ? new Date(rawStartAt) : null;
	const endAt = rawEndAt ? new Date(rawEndAt) : null;

	const bookingSemester = await ctx.cabinService.updateBookingSemester(
		ctx.user.id,
		{
			semester,
			startAt,
			endAt,
			bookingsEnabled,
		},
	);

	return { bookingSemester };
};

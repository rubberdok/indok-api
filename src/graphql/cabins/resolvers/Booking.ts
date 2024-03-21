import type { BookingResolvers } from "./../../types.generated.js";
export const Booking: BookingResolvers = {
	cabins: async ({ cabins }, _args, ctx) => {
		const cabinsResult = await Promise.all(
			cabins.map((cabin) => {
				return ctx.cabins.getCabin(cabin.id);
			}),
		);
		return cabinsResult;
	},
	guests: ({ internalParticipantsCount, externalParticipantsCount }) => {
		return {
			external: externalParticipantsCount,
			internal: internalParticipantsCount,
		};
	},
};

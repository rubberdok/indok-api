import type { ListingResolvers } from "./../../types.generated.js";
export const Listing: ListingResolvers = {
	organization: async (listing, _args, ctx) => {
		const organization = await ctx.organizations.organizations.get(
			listing.organizationId,
		);
		return organization;
	},
};

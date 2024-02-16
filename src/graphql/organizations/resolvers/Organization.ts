import { assertIsAuthenticated } from "~/graphql/auth.js";
import type { OrganizationResolvers } from "./../../types.generated.js";
export const Organization: OrganizationResolvers = {
	/* Implement Organization resolver logic here */
	members: async (parent, _args, ctx) => {
		assertIsAuthenticated(ctx);
		return await ctx.organizations.getMembers(ctx.user.id, parent.id);
	},
	featurePermissions: ({ featurePermissions }) => {
		/* Organization.featurePermissions resolver is required because Organization.featurePermissions and OrganizationMapper.featurePermissions are not compatible */
		return featurePermissions;
	},
	events: async ({ id }, _args, ctx) => {
		const events = await ctx.events.findMany({ organizationId: id });
		return events;
	},
	listings: async ({ id }, _args, ctx) => {
		const listings = await ctx.listings.findMany({ organizationId: id });
		return listings;
	},
};

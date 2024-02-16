import type { OrganizationResolvers } from "./../../types.generated.js";
export const Organization: OrganizationResolvers = {
	/* Implement Organization resolver logic here */
	members: async (parent, _args, ctx) => {
		const getMembersResult = await ctx.organizations.getMembers(ctx, parent.id);
		if (!getMembersResult.ok) {
			switch (getMembersResult.error.name) {
				case "PermissionDeniedError":
				case "UnauthorizedError":
					return null;
			}
		}
		const { members } = getMembersResult.data;
		return members;
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

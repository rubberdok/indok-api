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
};

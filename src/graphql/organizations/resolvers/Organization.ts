import type { OrganizationResolvers } from "./../../types.generated.js";
export const Organization: OrganizationResolvers = {
	/* Implement Organization resolver logic here */
	members: async (parent, _args, ctx) => {
		const getMembersResult = await ctx.organizations.members.findMany(ctx, {
			organizationId: parent.id,
		});
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
	logo: async ({ logoFileId }, _args, ctx) => {
		if (!logoFileId) return null;
		const getFileResult = await ctx.files.getFile(ctx, { id: logoFileId });
		if (!getFileResult.ok) {
			switch (getFileResult.error.name) {
				case "NotFoundError":
					ctx.log.error("Failed to get file", getFileResult.error);
					return null;
				case "InternalServerError":
					throw getFileResult.error;
			}
		}
		return getFileResult.data.file;
	},
};

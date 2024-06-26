import type { MutationResolvers } from "./../../../types.generated.js";
export const updateOrganization: NonNullable<
	MutationResolvers["updateOrganization"]
> = async (_parent, { data }, ctx) => {
	const { id, name, description, featurePermissions, logoFileId, colorScheme } =
		data;

	const organization = await ctx.organizations.organizations.update(ctx, id, {
		name,
		description,
		featurePermissions,
		logoFileId,
		colorScheme,
	});
	return { organization };
};

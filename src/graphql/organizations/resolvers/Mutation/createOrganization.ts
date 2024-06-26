import type { MutationResolvers } from "./../../../types.generated.js";
export const createOrganization: NonNullable<
	MutationResolvers["createOrganization"]
> = async (_parent, { data }, ctx) => {
	const { name, description, featurePermissions, colorScheme } = data;
	ctx.log.info(
		{ name, description, featurePermissions },
		"Creating organization",
	);
	const organization = await ctx.organizations.organizations.create(ctx, {
		name,
		description,
		featurePermissions,
		colorScheme,
	});
	return {
		organization,
	};
};

import type { QueryResolvers } from "./../../../types.generated.js";
export const hasFeaturePermission: NonNullable<
	QueryResolvers["hasFeaturePermission"]
> = async (_parent, { data }, ctx) => {
	const hasFeaturePermission =
		await ctx.organizations.permissions.hasFeaturePermission(ctx, {
			featurePermission: data.featurePermission,
		});
	return { hasFeaturePermission, id: data.featurePermission };
};

import { assertIsAuthenticated } from "~/graphql/auth.js";
import type { QueryResolvers } from "./../../../types.generated.js";
export const hasFeaturePermission: NonNullable<QueryResolvers['hasFeaturePermission']> = async (_parent, { data }, ctx) => {
	assertIsAuthenticated(ctx);

	const hasFeaturePermission = await ctx.permissions.hasFeaturePermission({
		userId: ctx.user.id,
		featurePermission: data.featurePermission,
	});
	ctx.log.info({
		userId: ctx.user.id,
		featurePermission: data.featurePermission,
		hasFeaturePermission,
	});
	return { hasFeaturePermission, id: data.featurePermission };
};

import type { QueryResolvers } from "./../../../types.generated.js";
export const hasRole: NonNullable<QueryResolvers["hasRole"]> = async (
	_parent,
	{ data: { organizationId, role } },
	ctx,
) => {
	const hasRole = await ctx.organizations.permissions.hasRole(ctx, {
		organizationId,
		role,
	});
	return {
		hasRole,
	};
};

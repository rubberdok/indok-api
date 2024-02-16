import type { QueryResolvers } from "./../../../types.generated.js";
export const hasRole: NonNullable<QueryResolvers["hasRole"]> = async (
	_parent,
	{ data: { organizationId, role } },
	ctx,
) => {
	const hasRole = await ctx.permissions.hasRole({
		userId: ctx.user?.id,
		organizationId,
		role,
	});
	return {
		hasRole,
	};
};

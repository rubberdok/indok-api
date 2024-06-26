import type { MutationResolvers } from "./../../../types.generated.js";
export const updateRole: NonNullable<MutationResolvers["updateRole"]> = async (
	_parent,
	{ data },
	ctx,
) => {
	const result = await ctx.organizations.members.updateRole(ctx, {
		memberId: data.memberId,
		newRole: data.role,
	});

	if (!result.ok) {
		throw result.error;
	}
	return result.data;
};

import type { QueryResolvers } from "./../../../types.generated.js";
export const users: NonNullable<QueryResolvers["users"]> = async (
	_parent,
	_arg,
	ctx,
) => {
	const users = await ctx.users.getAll();

	return {
		users,
	};
};

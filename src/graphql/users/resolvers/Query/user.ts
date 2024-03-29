import type { QueryResolvers } from "./../../../types.generated.js";
export const user: NonNullable<QueryResolvers["user"]> = (
	_parent,
	_arg,
	ctx,
) => {
	const { user } = ctx;
	return { user };
};

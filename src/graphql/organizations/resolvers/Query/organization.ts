import type { QueryResolvers } from "./../../../types.generated.js";
export const organization: NonNullable<QueryResolvers["organization"]> = async (
	_parent,
	{ data },
	ctx,
) => {
	const organization = await ctx.organizations.organizations.get(data.id);
	return { organization };
};

import type { QueryResolvers } from "./../../../types.generated.js";
export const documentCategories: NonNullable<
	QueryResolvers["documentCategories"]
> = async (_parent, _arg, ctx) => {
	const result = await ctx.documents.categories.findMany(ctx);

	if (!result.ok) {
		switch (result.error.name) {
			case "PermissionDeniedError":
			case "UnauthorizedError":
				return {
					categories: [],
					total: 0,
				};
			default:
				throw result.error;
		}
	}

	return result.data;
};

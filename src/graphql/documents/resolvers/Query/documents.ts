import type { QueryResolvers } from "./../../../types.generated.js";
export const documents: NonNullable<QueryResolvers["documents"]> = async (
	_parent,
	_arg,
	ctx,
) => {
	const findManyDocumentsResult = await ctx.documents.documents.findMany(ctx);
	if (!findManyDocumentsResult.ok) {
		switch (findManyDocumentsResult.error.name) {
			case "PermissionDeniedError":
			case "UnauthorizedError":
				return {
					documents: [],
					total: 0,
				};
			case "InternalServerError":
				throw findManyDocumentsResult.error;
		}
	}
	return findManyDocumentsResult.data;
};

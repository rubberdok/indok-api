import type { QueryResolvers } from "./../../../types.generated.js";
export const document: NonNullable<QueryResolvers["document"]> = async (
	_parent,
	{ data },
	ctx,
) => {
	const result = await ctx.documents.documents.find(ctx, { id: data.id });
	if (!result.ok) {
		switch (result.error.name) {
			case "NotFoundError":
			case "PermissionDeniedError":
			case "UnauthorizedError":
				return {
					document: null,
				};
			default:
				throw result.error;
		}
	}
	return {
		document: result.data.document,
	};
};

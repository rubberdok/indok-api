import type { QueryResolvers } from "./../../../types.generated.js";
export const order: NonNullable<QueryResolvers["order"]> = async (
	_parent,
	{ data },
	ctx,
) => {
	const result = await ctx.products.orders.get(ctx, { id: data.id });
	if (!result.ok) {
		switch (result.error.name) {
			case "NotFoundError":
			case "InternalServerError":
			case "PermissionDeniedError":
			case "UnauthorizedError":
				throw result.error;
		}
	}
	const { order } = result.data;
	return {
		order,
	};
};

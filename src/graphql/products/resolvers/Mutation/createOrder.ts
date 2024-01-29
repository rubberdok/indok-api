import type { MutationResolvers } from "./../../../types.generated.js";
export const createOrder: NonNullable<MutationResolvers["createOrder"]> =
	async (_parent, { data: { productId } }, ctx) => {
		const { order } = await ctx.products.createOrder(ctx, {
			productId,
		});

		return {
			order,
		};
	};

import type { MutationResolvers } from "./../../../types.generated.js";
export const createOrder: NonNullable<MutationResolvers["createOrder"]> =
	async (_parent, { data: { productId } }, ctx) => {
		const orderResult = await ctx.products.createOrder(ctx, {
			productId,
		});

		if (!orderResult.ok) {
			throw orderResult.error;
		}

		return {
			order: orderResult.data.order,
		};
	};

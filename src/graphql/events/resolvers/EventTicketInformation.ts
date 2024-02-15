import type { EventTicketInformationResolvers } from "./../../types.generated.js";
export const EventTicketInformation: EventTicketInformationResolvers = {
	/* Implement EventTicketInformation resolver logic here */
	product: async ({ productId }, _args, ctx) => {
		if (!productId) return null;
		const getProductResult = await ctx.products.products.get(ctx, {
			id: productId,
		});
		if (!getProductResult.ok) {
			switch (getProductResult.error.name) {
				case "NotFoundError":
					return null;
				default:
					throw getProductResult.error;
			}
		}
		return getProductResult.data.product;
	},
};

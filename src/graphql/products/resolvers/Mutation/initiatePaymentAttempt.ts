import type { MutationResolvers } from "./../../../types.generated.js";
export const initiatePaymentAttempt: NonNullable<
	MutationResolvers["initiatePaymentAttempt"]
> = async (_parent, { data: { orderId } }, ctx) => {
	const { redirectUrl } = await ctx.products.initiatePaymentAttempt(ctx, {
		orderId,
	});
	return {
		redirectUrl,
	};
};

import type { MutationResolvers } from "./../../../types.generated.js";
export const initiatePaymentAttempt: NonNullable<
	MutationResolvers["initiatePaymentAttempt"]
> = async (_parent, { data: { orderId } }, ctx) => {
	const result = await ctx.products.initiatePaymentAttempt(ctx, {
		orderId,
	});

	if (!result.ok) {
		throw result.error;
	}

	return {
		redirectUrl: result.data.redirectUrl,
	};
};

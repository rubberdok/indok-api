import type { MutationResolvers } from "./../../../types.generated.js";
export const initiatePaymentAttempt: NonNullable<
	MutationResolvers["initiatePaymentAttempt"]
> = async (_parent, { data: { orderId, returnUrl } }, ctx) => {
	const result = await ctx.products.payments.initiatePaymentAttempt(ctx, {
		orderId,
		returnUrl,
	});

	if (!result.ok) {
		throw result.error;
	}

	return {
		redirectUrl: result.data.redirectUrl,
	};
};

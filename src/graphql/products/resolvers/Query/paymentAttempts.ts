import type { QueryResolvers } from "./../../../types.generated.js";
export const paymentAttempts: NonNullable<
	QueryResolvers["paymentAttempts"]
> = async (_parent, { data }, ctx) => {
	const findManyPaymentAttemptsResult = await ctx.products.payments.findMany(
		ctx,
		data,
	);

	if (!findManyPaymentAttemptsResult.ok) {
		throw findManyPaymentAttemptsResult.error;
	}

	return {
		paymentAttempts: findManyPaymentAttemptsResult.data.paymentAttempts,
		total: findManyPaymentAttemptsResult.data.total,
	};
};

import type { MutationResolvers } from "./../../../types.generated.js";
export const createMerchant: NonNullable<MutationResolvers["createMerchant"]> =
	async (_parent, { data }, ctx) => {
		const { serialNumber, clientId, clientSecret, subscriptionKey, name } =
			data;
		const createMerchantResult = await ctx.products.merchants.create(ctx, {
			name,
			clientId,
			clientSecret,
			serialNumber,
			subscriptionKey,
		});

		if (!createMerchantResult.ok) {
			throw createMerchantResult.error;
		}

		return { merchant: createMerchantResult.data.merchant };
	};

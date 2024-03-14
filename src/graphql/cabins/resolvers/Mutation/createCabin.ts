import type { MutationResolvers } from "./../../../types.generated.js";
export const createCabin: NonNullable<MutationResolvers["createCabin"]> =
	async (_parent, { data }, ctx) => {
		const createCabinResult = await ctx.cabins.createCabin(ctx, data);

		if (!createCabinResult.ok) throw createCabinResult.error;

		return {
			cabin: createCabinResult.data.cabin,
		};
	};

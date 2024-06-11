import type { MutationResolvers } from "./../../../types.generated.js";
export const updateCabin: NonNullable<
	MutationResolvers["updateCabin"]
> = async (_parent, { data }, ctx) => {
	const updateCabinResponse = await ctx.cabins.updateCabin(ctx, data);
	if (!updateCabinResponse.ok) throw updateCabinResponse.error;
	const { cabin } = updateCabinResponse.data;
	return { cabin };
};

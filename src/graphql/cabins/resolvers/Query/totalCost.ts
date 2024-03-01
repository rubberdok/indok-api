import type { QueryResolvers } from "./../../../types.generated.js";
export const totalCost: NonNullable<QueryResolvers["totalCost"]> = async (
	_parent,
	{ data },
	ctx,
) => {
	const totalCostResult = await ctx.cabins.totalCost(data);
	if (!totalCostResult.ok) {
		throw totalCostResult.error;
	}
	return totalCostResult.data;
};

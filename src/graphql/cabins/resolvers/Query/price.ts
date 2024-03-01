import type { QueryResolvers } from "./../../../types.generated.js";
export const price: NonNullable<QueryResolvers["price"]> = async (
	_parent,
	{ data },
	ctx,
) => {
	const { startDate, endDate, participants, cabins } = data;

	const priceResult = await ctx.cabins.price({
		startDate,
		endDate,
		participants,
		cabins,
	});

	if (!priceResult.ok) {
		switch (priceResult.error.name) {
			case "NotFoundError":
			case "InvalidArgumentError":
			case "InternalServerError":
				throw priceResult.error;
		}
	}
	return {
		price: priceResult.data.price,
	};
};

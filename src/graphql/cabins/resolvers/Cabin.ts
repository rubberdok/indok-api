import type { CabinResolvers } from "./../../types.generated.js";
export const Cabin: CabinResolvers = {
	/* Implement Cabin resolver logic here */
	price: ({
		internalPrice,
		internalPriceWeekend,
		externalPrice,
		externalPriceWeekend,
	}) => {
		return {
			internal: {
				weekday: internalPrice,
				weekend: internalPriceWeekend,
			},
			external: {
				weekday: externalPrice,
				weekend: externalPriceWeekend,
			},
		};
	},
};

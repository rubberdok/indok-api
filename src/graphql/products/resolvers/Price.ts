import type { PriceResolvers } from "./../../types.generated.js";
export const Price: PriceResolvers = {
	/* Implement Price resolver logic here */
	valueInNok: ({ value }) => {
		return value / 100;
	},
};

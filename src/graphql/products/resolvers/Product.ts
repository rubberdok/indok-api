import type { ProductResolvers } from "./../../types.generated.js";
export const Product: ProductResolvers = {
	/* Implement Product resolver logic here */
	price: ({ price }) => {
		/* Product.price resolver is required because Product.price and ProductMapper.price are not compatible */
		return { value: price, unit: "NOK (øre)" };
	},
};

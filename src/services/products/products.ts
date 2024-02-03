import { InternalServerError, UnauthorizedError } from "~/domain/errors.js";
import type { ProductType } from "~/domain/products.js";
import type { ResultAsync } from "~/lib/result.js";
import type { Context } from "../../lib/context.js";
import type { BuildProductsDependencies } from "./service.js";

function buildProducts({ productRepository }: BuildProductsDependencies) {
	return {
		async create(
			ctx: Context,
			data: Pick<ProductType, "price" | "description" | "name"> & {
				merchantId: string;
			},
		): ResultAsync<{ product: ProductType }> {
			if (!ctx.user) {
				return {
					ok: false,
					error: new UnauthorizedError(
						"You must be logged in to create a product",
					),
				};
			}

			const { product } = await productRepository.createProduct({
				name: data.name,
				price: data.price,
				merchantId: data.merchantId,
			});

			ctx.log.info({ userId: ctx.user.id }, "ProductType created");

			return { ok: true, data: { product } };
		},

		/**
		 * findMany returns all products.
		 */
		async findMany(
			_ctx: Context,
		): ResultAsync<{ products: ProductType[]; total: number }> {
			try {
				const { products, total } = await productRepository.getProducts();
				return { ok: true, data: { products, total } };
			} catch (err) {
				return {
					ok: false,
					error: new InternalServerError("Failed to get products"),
				};
			}
		},
	} as const;
}

export { buildProducts };

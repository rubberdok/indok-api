import {
	InternalServerError,
	type InvalidArgumentError,
	NotFoundError,
	UnauthorizedError,
} from "~/domain/errors.js";
import { Product, type ProductType } from "~/domain/products.js";
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
		): ResultAsync<
			{ product: ProductType },
			UnauthorizedError | InvalidArgumentError
		> {
			if (!ctx.user) {
				return {
					ok: false,
					error: new UnauthorizedError(
						"You must be logged in to create a product",
					),
				};
			}

			const newProductResult = Product.new(data);
			if (!newProductResult.ok) {
				return newProductResult;
			}

			const { product } = await productRepository.createProduct(
				newProductResult.data.product,
			);

			ctx.log.info({ userId: ctx.user.id }, "ProductType created");

			return { ok: true, data: { product } };
		},

		/**
		 * findMany returns all products.
		 */
		async findMany(
			_ctx: Context,
		): ResultAsync<
			{ products: ProductType[]; total: number },
			InternalServerError
		> {
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

		async get(
			_ctx: Context,
			params: { id: string },
		): ResultAsync<{ product: ProductType }, NotFoundError> {
			const { product } = await productRepository.getProduct(params.id);
			if (!product) {
				return {
					ok: false,
					error: new NotFoundError("Product not found"),
				};
			}

			return { ok: true, data: { product } };
		},
	} as const;
}

export { buildProducts };

import { NotFoundError, UnauthorizedError } from "~/domain/errors.js";
import type { OrderType } from "~/domain/products.js";
import type { ResultAsync } from "~/lib/result.js";
import type { Context } from "../../lib/context.js";
import type { BuildProductsDependencies } from "./service.js";

function buildOrders({ productRepository }: BuildProductsDependencies) {
	return {
		/**
		 * create creates a new order.
		 */
		async create(
			ctx: Context,
			data: Pick<OrderType, "productId">,
		): ResultAsync<{ order: OrderType }> {
			if (!ctx.user) {
				return {
					ok: false,
					error: new UnauthorizedError(
						"You must be logged in to create an order",
					),
				};
			}

			ctx.log.info(
				{ userId: ctx.user.id, productId: data.productId },
				"Creating order",
			);

			const { product } = await productRepository.getProduct(data.productId);
			if (product === null) {
				return {
					ok: false,
					error: new NotFoundError("ProductType not found"),
				};
			}

			const { order } = await productRepository.createOrder({
				userId: ctx.user.id,
				product: product,
			});

			ctx.log.info(
				{ userId: ctx.user.id, productId: data.productId },
				"OrderType created",
			);

			return { ok: true, data: { order } };
		},
	} as const;
}

export { buildOrders };

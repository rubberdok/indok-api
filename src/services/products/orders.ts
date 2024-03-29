import {
	type InternalServerError,
	NotFoundError,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
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
		): ResultAsync<{ order: OrderType }, UnauthorizedError | NotFoundError> {
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
				totalPrice: product.price,
			});

			ctx.log.info(
				{ userId: ctx.user.id, productId: data.productId },
				"OrderType created",
			);

			return { ok: true, data: { order } };
		},

		async get(
			ctx: Context,
			params: { id: string },
		): ResultAsync<
			{ order: OrderType },
			| NotFoundError
			| UnauthorizedError
			| PermissionDeniedError
			| InternalServerError
		> {
			if (!ctx.user) {
				return {
					ok: false,
					error: new UnauthorizedError("You must be logged in to get an order"),
				};
			}

			const getOrderResult = await productRepository.getOrder(params.id);
			if (!getOrderResult.ok) {
				return {
					ok: false,
					error: getOrderResult.error,
				};
			}
			const { order } = getOrderResult.data;
			if (order === null) {
				return {
					ok: false,
					error: new NotFoundError("Order not found"),
				};
			}

			if (!ctx.user.isSuperUser && order.userId !== ctx.user.id) {
				return {
					ok: false,
					error: new NotFoundError("Order not found"),
				};
			}

			return { ok: true, data: { order } };
		},

		async findMany(
			ctx: Context,
			params?: { userId?: string; productId?: string },
		): ResultAsync<
			{ orders: OrderType[]; total: number },
			InternalServerError | PermissionDeniedError | UnauthorizedError
		> {
			if (ctx.user === null) {
				return {
					ok: false,
					error: new UnauthorizedError("You must be logged in to get orders"),
				};
			}
			if (ctx.user.isSuperUser) {
				return await productRepository.findManyOrders(params);
			}

			const { userId, productId } = params ?? {};
			if (userId && userId !== ctx.user.id) {
				return {
					ok: false,
					error: new PermissionDeniedError("You can only get your own orders"),
				};
			}

			return await productRepository.findManyOrders({
				userId: ctx.user.id,
				productId,
			});
		},
	} as const;
}

export { buildOrders };

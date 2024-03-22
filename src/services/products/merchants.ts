import {
	InternalServerError,
	InvalidArgumentError,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
import type { MerchantType } from "~/domain/products.js";
import { Result, type ResultAsync } from "~/lib/result.js";
import type { IProductService } from "~/lib/server.js";
import type { Context } from "../../lib/context.js";
import type { BuildProductsDependencies } from "./service.js";

function buildMerchants({
	productRepository,
}: BuildProductsDependencies): IProductService["merchants"] {
	return {
		/**
		 * createMerchant creates a new merchant.
		 */
		async create(
			ctx: Context,
			data: {
				name: string;
				serialNumber: string;
				subscriptionKey: string;
				clientId: string;
				clientSecret: string;
			},
		): ResultAsync<
			{ merchant: MerchantType },
			| PermissionDeniedError
			| UnauthorizedError
			| InvalidArgumentError
			| InternalServerError
		> {
			const { user } = ctx;
			if (ctx.user === null) {
				return {
					ok: false,
					error: new UnauthorizedError(
						"You must be logged in to create a merchant",
					),
				};
			}
			if (!user?.isSuperUser) {
				return {
					ok: false,
					error: new PermissionDeniedError(
						"You must be a super user to create a merchant",
					),
				};
			}

			try {
				const { merchant } = await productRepository.createMerchant(data);
				return { ok: true, data: { merchant } };
			} catch (err) {
				if (err instanceof InvalidArgumentError) {
					return {
						ok: false,
						error: err,
					};
				}
				return {
					ok: false,
					error: new InternalServerError("Failed to create merchant"),
				};
			}
		},

		async findMany(ctx) {
			if (!ctx.user) {
				return Result.error(
					new UnauthorizedError("You must be logged in to view merchants"),
				);
			}

			const findManyMerchantsResult =
				await productRepository.findManyMerchants(ctx);
			return findManyMerchantsResult;
		},
	} as const;
}

export { buildMerchants };

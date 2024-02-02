import { mock } from "jest-mock-extended";
import { UnauthorizedError } from "~/domain/errors.js";
import type { OrderType, ProductType } from "~/domain/products.js";
import type { User } from "~/domain/users.js";
import { makeMockContext } from "~/services/context.js";
import { makeDependencies } from "./dependencies.js";

describe("OrderService", () => {
	const { productService, productRepository } = makeDependencies();

	describe("#createOrder", () => {
		it("should fail if the user is not logged in", async () => {
			const ctx = makeMockContext(null);

			const result = await productService.orders.create(ctx, {
				productId: "123456",
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(UnauthorizedError),
			});
		});

		it("should succeed if the user is logged in", async () => {
			const ctx = makeMockContext(mock<User>({}));
			productRepository.getProduct.mockResolvedValueOnce({
				product: mock<ProductType>({}),
			});
			productRepository.createOrder.mockResolvedValueOnce({
				order: mock<OrderType>({}),
				product: mock<ProductType>({}),
			});

			const result = await productService.orders.create(ctx, {
				productId: "123456",
			});

			expect(result.ok).toBe(true);
			expect(productRepository.createOrder).toHaveBeenCalled();
		});
	});
});

import { mock } from "jest-mock-extended";
import { UnauthorizedError } from "~/domain/errors.js";
import type { Product } from "~/domain/products.js";
import type { User } from "~/domain/users.js";
import { makeMockContext } from "~/services/context.js";
import { makeDependencies } from "./dependencies.js";

describe("ProductService", () => {
	const { productService, productRepository } = makeDependencies();

	describe("#createProducts", () => {
		it("should fail if the user is not logged in", async () => {
			const ctx = makeMockContext(null);

			const result = await productService.createProduct(ctx, {
				merchantId: "123456",
				name: "Test",
				price: 123,
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(UnauthorizedError),
			});
		});

		it("should succeed if the user is logged in", async () => {
			const ctx = makeMockContext(mock<User>({ isSuperUser: true }));

			productRepository.createProduct.mockResolvedValueOnce({
				product: mock<Product>({}),
			});

			const result = await productService.createProduct(ctx, {
				merchantId: "123456",
				name: "Test",
				price: 123,
			});

			expect(result.ok).toBe(true);
			expect(productRepository.createProduct).toHaveBeenCalled();
		});
	});

	describe("#getProducts", () => {
		it("should return a list of products", async () => {
			const ctx = makeMockContext(mock<User>({ isSuperUser: false }));

			productRepository.getProducts.mockResolvedValueOnce({
				products: [mock<Product>({}), mock<Product>({})],
				total: 2,
			});

			const result = await productService.getProducts(ctx);

			expect(result.ok).toBe(true);
		});
	});
});

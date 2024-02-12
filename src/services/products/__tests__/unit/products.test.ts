import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import { NotFoundError, UnauthorizedError } from "~/domain/errors.js";
import type { ProductType } from "~/domain/products.js";
import type { User } from "~/domain/users.js";
import { makeMockContext } from "~/lib/context.js";
import { makeDependencies } from "./dependencies.js";

describe("ProductService", () => {
	const { productService, productRepository } = makeDependencies();

	describe("#createProducts", () => {
		it("should fail if the user is not logged in", async () => {
			const ctx = makeMockContext(null);

			const result = await productService.products.create(ctx, {
				merchantId: "123456",
				name: "Test",
				price: 123,
				description: "test",
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(UnauthorizedError),
			});
		});

		it("should succeed if the user is logged in", async () => {
			const ctx = makeMockContext(mock<User>({ isSuperUser: true }));

			productRepository.createProduct.mockResolvedValueOnce({
				product: mock<ProductType>({}),
			});

			const result = await productService.products.create(ctx, {
				merchantId: faker.string.uuid(),
				name: "Test",
				price: 123,
				description: "test",
			});

			if (!result.ok) throw result.error;

			expect(result.ok).toBe(true);
			expect(productRepository.createProduct).toHaveBeenCalled();
		});
	});

	describe("#getProducts", () => {
		it("should return a list of products", async () => {
			const ctx = makeMockContext(mock<User>({ isSuperUser: false }));

			productRepository.getProducts.mockResolvedValueOnce({
				products: [mock<ProductType>({}), mock<ProductType>({})],
				total: 2,
			});

			const result = await productService.products.findMany(ctx);

			expect(result.ok).toBe(true);
		});
	});

	describe("#get", () => {
		it("should return a product", async () => {
			const ctx = makeMockContext(mock<User>({ isSuperUser: false }));

			productRepository.getProduct.mockResolvedValueOnce({
				product: mock<ProductType>({}),
			});

			const result = await productService.products.get(ctx, {
				id: faker.string.uuid(),
			});

			expect(result.ok).toBe(true);
		});

		it("should return NotFound if it doesn't exist", async () => {
			const ctx = makeMockContext(mock<User>({ isSuperUser: false }));

			productRepository.getProduct.mockResolvedValueOnce({
				product: null,
			});

			const result = await productService.products.get(ctx, {
				id: faker.string.uuid(),
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(NotFoundError),
			});
		});
	});
});

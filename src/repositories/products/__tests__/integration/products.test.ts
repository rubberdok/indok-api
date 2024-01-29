import { faker } from "@faker-js/faker";
import { makeDependencies } from "./dependencies.js";

describe("ProductRepository", () => {
	describe("products", () => {
		describe("#createProduct", () => {
			it("creates a product", async () => {
				const { merchant, productRepository } = await makeDependencies();

				const actual = await productRepository.createProduct({
					merchantId: merchant.id,
					price: 100,
					name: faker.commerce.productName(),
				});

				expect(actual.product).toBeDefined();
			});
		});

		describe("#getProduct", () => {
			it("returns a product", async () => {
				const { product, productRepository } = await makeDependencies();

				const actual = await productRepository.getProduct(product.id);

				expect(actual.product).toBeDefined();
			});

			it("returns null if the product does not exist", async () => {
				const { productRepository } = await makeDependencies();

				const actual = await productRepository.getProduct(faker.string.uuid());

				expect(actual.product).toBeNull();
			});
		});

		describe("#getProducts", () => {
			it("returns a list of products and the total count", async () => {
				const { productRepository, product } = await makeDependencies();

				const actual = await productRepository.getProducts();

				expect(actual.products).toBeDefined();
				expect(actual.products.map((p) => p.id)).toContain(product.id);
				expect(actual.total).toBeGreaterThan(0);
			});
		});
	});
});

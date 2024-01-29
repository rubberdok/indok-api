import { fail } from "assert";
import { NotFoundError } from "~/domain/errors.js";
import { makeDependencies } from "./dependencies.js";

describe("ProductRepository", () => {
	describe("orders", () => {
		describe("#createOrder", () => {
			it("creates an order", async () => {
				const { product, user, productRepository } = await makeDependencies();

				/**
				 * Act
				 *
				 * Create an order
				 */
				const actual = await productRepository.createOrder({
					product,
					userId: user.id,
				});

				expect(actual.order).toBeDefined();
				expect(actual.product).toBeDefined();
				expect(actual.product.version).toBe(product.version + 1);
			});

			it("raises NotFoundError if the version of the product does not match", async () => {
				const { product, user, productRepository } = await makeDependencies();

				/**
				 * Act
				 *
				 * Create two orders, both with the same version of the product.
				 */
				await productRepository.createOrder({
					product,
					userId: user.id,
				});
				try {
					await productRepository.createOrder({
						product,
						userId: user.id,
					});
					fail("Expected NotFoundError to be raised");
				} catch (err) {
					expect(err).toBeInstanceOf(NotFoundError);
				}
			});
		});
	});
});

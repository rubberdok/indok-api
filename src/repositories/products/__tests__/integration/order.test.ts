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
					totalPrice: product.price,
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
					totalPrice: product.price,
				});
				try {
					await productRepository.createOrder({
						product,
						userId: user.id,
						totalPrice: product.price,
					});
					fail("Expected NotFoundError to be raised");
				} catch (err) {
					expect(err).toBeInstanceOf(NotFoundError);
				}
			});
		});

		describe("#findManyOrders", () => {
			it("returns orders for a user", async () => {
				/**
				 * Act
				 *
				 * Create an order
				 */
				const { order, user, productRepository } = await makeDependencies();

				/**
				 * Act
				 *
				 * Find the order
				 */
				const actual = await productRepository.findManyOrders({
					userId: user.id,
				});
				if (!actual.ok) throw actual.error;

				expect(actual.data.orders).toHaveLength(1);
				expect(actual.data.orders).toEqual([order]);
			});

			it("returns orders for a product", async () => {
				/**
				 * Act
				 *
				 * Create an order
				 */
				const { order, product, productRepository } = await makeDependencies();

				/**
				 * Act
				 *
				 * Find the order
				 */
				const actual = await productRepository.findManyOrders({
					productId: product.id,
				});
				if (!actual.ok) throw actual.error;

				expect(actual.data.orders).toHaveLength(1);
				expect(actual.data.orders).toEqual([order]);
			});

			it("returns orders for a product and user", async () => {
				/**
				 * Act
				 *
				 * Create an order
				 */
				const { order, product, user, productRepository } =
					await makeDependencies();
				const { user: otherUser, product: otherProduct } =
					await makeDependencies();

				/**
				 * Create an order for a different user
				 */
				await productRepository.createOrder({
					userId: otherUser.id,
					product,
					totalPrice: product.price,
				});

				/**
				 * Create an order for a different product, same user.
				 */
				await productRepository.createOrder({
					userId: user.id,
					product: otherProduct,
					totalPrice: product.price,
				});

				/**
				 * Act
				 *
				 * Find the order
				 */
				const actual = await productRepository.findManyOrders({
					productId: product.id,
					userId: user.id,
				});
				if (!actual.ok) throw actual.error;

				expect(actual.data.orders).toHaveLength(1);
				expect(actual.data.orders).toEqual([order]);
			});

			it("returns all orders", async () => {
				/**
				 * Act
				 *
				 * Create an order
				 */
				const { order, product, user, productRepository } =
					await makeDependencies();
				const { user: otherUser, product: otherProduct } =
					await makeDependencies();

				/**
				 * Create an order for a different user
				 */
				const { order: differentUserOrder } =
					await productRepository.createOrder({
						userId: otherUser.id,
						product,
						totalPrice: product.price,
					});

				/**
				 * Create an order for a different product, same user.
				 */
				const { order: differentProductOrder } =
					await productRepository.createOrder({
						userId: user.id,
						product: otherProduct,
						totalPrice: otherProduct.price,
					});

				/**
				 * Act
				 *
				 * Find the order
				 */
				const actual = await productRepository.findManyOrders();
				if (!actual.ok) throw actual.error;

				expect(actual.data.orders).toContainEqual(order);
				expect(actual.data.orders).toContainEqual(differentProductOrder);
				expect(actual.data.orders).toContainEqual(differentUserOrder);
			});
		});
	});
});

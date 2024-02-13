import assert from "assert";
import { faker } from "@faker-js/faker";
import { NotFoundError } from "~/domain/errors.js";
import { makeDependencies } from "./dependencies.js";

describe("ProductRepository", () => {
	describe("#createPaymentAttempt", () => {
		it("creates a payment attempt and updates the order", async () => {
			const { order, productRepository } = await makeDependencies();

			// Call the method under test
			const result = await productRepository.createPaymentAttempt({
				order,
				reference: order.id,
			});

			// Assert the result
			expect(result.paymentAttempt).toBeDefined();
			expect(result.order).toBeDefined();
			expect(result.order.attempt).toBe(order.version + 1);
			expect(result.order.version).toBe(order.version + 1);
		});

		it("raises NotFoundError if the version of the order does not match", async () => {
			const { order, productRepository } = await makeDependencies();

			await productRepository.createPaymentAttempt({
				order,
				reference: faker.string.uuid(),
			});

			// Call the method under test
			try {
				await productRepository.createPaymentAttempt({
					order,
					reference: faker.string.uuid(),
				});
				fail("Expected NotFoundError to be raised");
			} catch (err) {
				expect(err).toBeInstanceOf(NotFoundError);
			}
		});
	});

	describe("#getPaymentAttempt", () => {
		it("returns a payment attempt", async () => {
			const { order, productRepository } = await makeDependencies();

			const { paymentAttempt } = await productRepository.createPaymentAttempt({
				order,
				reference: order.id,
			});

			// Call the method under test
			const result = await productRepository.getPaymentAttempt({
				id: paymentAttempt.id,
			});

			// Assert the result
			if (!result.ok) throw result.error;
			expect(result.data.paymentAttempt).toBeDefined();
		});

		it("returns null if the payment attempt does not exist", async () => {
			const { productRepository } = await makeDependencies();
			// Call the method under test
			const result = await productRepository.getPaymentAttempt({
				id: faker.string.uuid(),
			});

			// Assert the result
			if (!result.ok) throw result.error;
			expect(result.data.paymentAttempt).toBeNull();
		});
	});

	describe("#updatePaymentAttempt", () => {
		it("updates a payment attempt", async () => {
			const { order, productRepository } = await makeDependencies();

			const { paymentAttempt, order: updatedOrder } =
				await productRepository.createPaymentAttempt({
					order,
					reference: order.id,
				});

			// Call the method under test
			const result = await productRepository.updatePaymentAttempt(
				{
					id: paymentAttempt.id,
					version: paymentAttempt.version,
					state: "AUTHORIZED",
				},
				{
					id: updatedOrder.id,
					version: updatedOrder.version,
				},
			);

			// Assert the result
			expect(result.paymentAttempt).toBeDefined();
			expect(result.paymentAttempt.state).toEqual("AUTHORIZED");
			expect(result.order.version).toEqual(updatedOrder.version + 1);
		});

		it("should raise NotFoundError if the version of the payment attempt does not match", async () => {
			const { order, productRepository } = await makeDependencies();

			const { paymentAttempt } = await productRepository.createPaymentAttempt({
				order,
				reference: order.id,
			});

			// Call the method under test
			try {
				await productRepository.updatePaymentAttempt(
					{
						id: paymentAttempt.id,
						version: paymentAttempt.version + 1,
						state: "AUTHORIZED",
					},
					{
						id: order.id,
						version: order.version,
					},
				);
				fail("Expected NotFoundError to be raised");
			} catch (err) {
				expect(err).toBeInstanceOf(NotFoundError);
			}
		});

		it("should raise NotFoundError if the payment attempt does not exist", async () => {
			const { productRepository } = await makeDependencies();
			// Call the method under test
			try {
				await productRepository.updatePaymentAttempt(
					{
						id: faker.string.uuid(),
						version: 1,
						state: "AUTHORIZED",
					},
					{
						id: faker.string.uuid(),
						version: 1,
					},
				);
				fail("Expected NotFoundError to be raised");
			} catch (err) {
				expect(err).toBeInstanceOf(NotFoundError);
			}
		});
	});

	describe("#findManyPaymentAttempts", () => {
		it("by order id", async () => {
			const { productRepository, order } = await makeDependencies();

			const { paymentAttempt } = await productRepository.createPaymentAttempt({
				order,
				reference: order.id,
			});

			// Act
			const result = await productRepository.findManyPaymentAttempts({
				orderId: order.id,
			});

			// Assert
			if (!result.ok) throw result.error;

			expect(result.data.paymentAttempts).toEqual([paymentAttempt]);
		});

		it("by product id", async () => {
			const { productRepository, order, product } = await makeDependencies();

			const { paymentAttempt } = await productRepository.createPaymentAttempt({
				order,
				reference: order.id,
			});

			// Act
			const result = await productRepository.findManyPaymentAttempts({
				productId: product.id,
			});

			// Assert
			if (!result.ok) throw result.error;

			expect(result.data.paymentAttempts).toEqual([paymentAttempt]);
		});

		it("by user id", async () => {
			const { productRepository, order, user } = await makeDependencies();

			const { paymentAttempt } = await productRepository.createPaymentAttempt({
				order,
				reference: order.id,
			});

			// Act
			const result = await productRepository.findManyPaymentAttempts({
				userId: user.id,
			});

			// Assert
			if (!result.ok) throw result.error;

			expect(result.data.paymentAttempts).toEqual([paymentAttempt]);
		});

		it("by user, product, and order ID", async () => {
			const { productRepository, order, user, product } =
				await makeDependencies();
			const { user: otherUser, product: otherProduct } =
				await makeDependencies();

			const { paymentAttempt: expectedPaymentAttempt } =
				await productRepository.createPaymentAttempt({
					order,
					reference: order.id,
				});

			// Create a payment attempt for a different user
			const { order: otherUserOrder } = await productRepository.createOrder({
				userId: otherUser.id,
				product: product,
				totalPrice: product.price,
			});
			await productRepository.createPaymentAttempt({
				order: otherUserOrder,
				reference: otherUserOrder.id,
			});

			// Create a payment attempt for a different product
			const { order: otherProductOrder } = await productRepository.createOrder({
				userId: user.id,
				product: otherProduct,
				totalPrice: otherProduct.price,
			});
			await productRepository.createPaymentAttempt({
				order: otherProductOrder,
				reference: otherProductOrder.id,
			});

			const { product: sameProduct } = await productRepository.getProduct(
				product.id,
			);
			assert(sameProduct !== null, "Product not found");
			// Create another payment attempt for the same user, but different order
			const { order: otherOrder } = await productRepository.createOrder({
				userId: user.id,
				product: sameProduct,
				totalPrice: sameProduct.price,
			});
			await productRepository.createPaymentAttempt({
				order: otherOrder,
				reference: otherOrder.id,
			});

			// Act
			const result = await productRepository.findManyPaymentAttempts({
				userId: user.id,
				productId: product.id,
				orderId: order.id,
			});

			// Assert
			if (!result.ok) throw result.error;

			expect(result.data.paymentAttempts).toEqual([expectedPaymentAttempt]);
		});

		it("should return all payment attempts", async () => {
			const { productRepository, order, user, product } =
				await makeDependencies();
			const { user: otherUser, product: otherProduct } =
				await makeDependencies();

			const { paymentAttempt: expectedPaymentAttempt } =
				await productRepository.createPaymentAttempt({
					order,
					reference: order.id,
				});

			// Create a payment attempt for a different user
			const { order: otherUserOrder } = await productRepository.createOrder({
				userId: otherUser.id,
				product: product,
				totalPrice: product.price,
			});
			const { paymentAttempt: otherUserPaymentAttempt } =
				await productRepository.createPaymentAttempt({
					order: otherUserOrder,
					reference: otherUserOrder.id,
				});

			// Create a payment attempt for a different product
			const { order: otherProductOrder } = await productRepository.createOrder({
				userId: user.id,
				product: otherProduct,
				totalPrice: otherProduct.price,
			});
			const { paymentAttempt: otherProductPaymentAttempt } =
				await productRepository.createPaymentAttempt({
					order: otherProductOrder,
					reference: otherProductOrder.id,
				});

			const { product: sameProduct } = await productRepository.getProduct(
				product.id,
			);
			assert(sameProduct !== null, "Product not found");
			// Create another payment attempt for the same user, but different order
			const { order: otherOrder } = await productRepository.createOrder({
				userId: user.id,
				product: sameProduct,
				totalPrice: sameProduct.price,
			});
			const { paymentAttempt: otherOrderPaymentAttempt } =
				await productRepository.createPaymentAttempt({
					order: otherOrder,
					reference: otherOrder.id,
				});

			// Act
			const result = await productRepository.findManyPaymentAttempts();

			// Assert
			if (!result.ok) throw result.error;

			expect(result.data.paymentAttempts).toContainEqual(
				expectedPaymentAttempt,
			);
			expect(result.data.paymentAttempts).toContainEqual(
				otherUserPaymentAttempt,
			);
			expect(result.data.paymentAttempts).toContainEqual(
				otherProductPaymentAttempt,
			);
			expect(result.data.paymentAttempts).toContainEqual(
				otherOrderPaymentAttempt,
			);
		});
	});
});

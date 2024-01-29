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
			expect(result.paymentAttempt).toBeDefined();
		});

		it("returns null if the payment attempt does not exist", async () => {
			const { productRepository } = await makeDependencies();
			// Call the method under test
			const result = await productRepository.getPaymentAttempt({
				id: faker.string.uuid(),
			});

			// Assert the result
			expect(result.paymentAttempt).toBeNull();
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
					paymentStatus: "RESERVED",
				},
			);

			// Assert the result
			expect(result.paymentAttempt).toBeDefined();
			expect(result.paymentAttempt.state).toEqual("AUTHORIZED");
			expect(result.order.paymentStatus).toEqual("RESERVED");
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
						paymentStatus: "RESERVED",
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
						paymentStatus: "RESERVED",
					},
				);
				fail("Expected NotFoundError to be raised");
			} catch (err) {
				expect(err).toBeInstanceOf(NotFoundError);
			}
		});
	});
});

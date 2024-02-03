import { faker } from "@faker-js/faker";
import type { EPaymentErrorResponse } from "@vippsmobilepay/sdk";
import { mock } from "jest-mock-extended";
import type {
	OrderType,
	PaymentAttempt,
	ProductType,
} from "~/domain/products.js";
import type { User } from "~/domain/users.js";
import { makeMockContext } from "~/lib/context.js";
import { makeDependencies } from "./dependencies.js";

describe("ProductService", () => {
	const {
		productService,
		mockVippsClient,
		productRepository,
		mockPaymentProcessingQueue,
	} = makeDependencies();
	describe("#initiatePaymentAttempt", () => {
		it("should create a payment attempt with Vipps and add polling to queue", async () => {
			/**
			 * Arrange
			 *
			 * Mock an existing order
			 * Mock an existing product
			 * Mock the `create` method for Vipps
			 */
			const orderId = faker.string.uuid();
			const price = 100;
			productRepository.getOrder.mockResolvedValueOnce({
				order: {
					attempt: 0,
					id: orderId,
					productId: faker.string.uuid(),
					version: 0,
					paymentStatus: "PENDING",
				},
			});
			productRepository.getProduct.mockResolvedValueOnce({
				product: {
					id: faker.string.uuid(),
					price,
					name: faker.word.adjective(),
					description: faker.lorem.sentence(),
					version: 0,
					merchant: {
						id: faker.string.uuid(),
						serialNumber: faker.string.sample(6),
						subscriptionKey: faker.string.uuid(),
						name: faker.company.name(),
						clientId: faker.string.uuid(),
						clientSecret: faker.string.uuid(),
					},
				},
			});
			productRepository.createPaymentAttempt.mockResolvedValue({
				paymentAttempt: {
					id: faker.string.uuid(),
					reference: orderId,
					state: "CREATED",
					version: 0,
					orderId,
					inProgress: true,
				},
				order: {
					attempt: 1,
					id: orderId,
					productId: faker.string.uuid(),
					version: 0,
					paymentStatus: "CREATED",
				},
			});
			mockVippsClient.payment.create.mockImplementation((_token, body) => {
				return Promise.resolve({
					ok: true,
					data: {
						reference: body.reference || faker.string.uuid(),
						redirectUrl: faker.internet.url(),
					},
				});
			});

			/**
			 * Act
			 *
			 * Initiate a payment attempt
			 */
			await productService.payments.initiatePaymentAttempt(
				makeMockContext(
					mock<User>({
						id: faker.string.uuid(),
					}),
				),
				{
					orderId,
				},
			);

			expect(mockVippsClient.payment.create).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					amount: {
						value: price,
						currency: "NOK",
					},
					reference: expect.stringContaining(orderId),
				}),
			);
			expect(mockPaymentProcessingQueue.add).toHaveBeenCalledWith(
				"payment-processing",
				{ reference: expect.any(String) },
				{
					jobId: expect.any(String),
					delay: 5 * 1000,
					repeat: {
						every: 2 * 1000,
						limit: 300,
					},
				},
			);
		});

		it("should fail with UnauthorizedError if not logged in", async () => {
			const result = await productService.payments.initiatePaymentAttempt(
				makeMockContext(null),
				{
					orderId: faker.string.uuid(),
				},
			);

			expect(result).toEqual({
				ok: false,
				error: expect.objectContaining({
					name: "UnauthorizedError",
				}),
			});
		});

		it("should fail with NotFoundError if the order does not exist", async () => {
			productRepository.getOrder.mockResolvedValueOnce({
				order: null,
			});

			const result = await productService.payments.initiatePaymentAttempt(
				makeMockContext(mock<User>({})),
				{
					orderId: faker.string.uuid(),
				},
			);

			expect(result).toEqual({
				ok: false,
				error: expect.objectContaining({
					name: "NotFoundError",
				}),
			});
		});

		it("should fail with InvalidArgumentError if the order is captured", async () => {
			productRepository.getOrder.mockResolvedValueOnce({
				order: mock<OrderType>({
					paymentStatus: "CAPTURED",
				}),
			});

			const result = await productService.payments.initiatePaymentAttempt(
				makeMockContext(mock<User>({})),
				{
					orderId: faker.string.uuid(),
				},
			);

			expect(result).toEqual({
				ok: false,
				error: expect.objectContaining({
					name: "InvalidArgumentError",
					description: expect.stringContaining("captured"),
				}),
			});
		});

		it("should fail with InvalidArgumentError if the order is cancelled", async () => {
			productRepository.getOrder.mockResolvedValueOnce({
				order: mock<OrderType>({
					paymentStatus: "CANCELLED",
				}),
			});

			const result = await productService.payments.initiatePaymentAttempt(
				makeMockContext(mock<User>({})),
				{
					orderId: faker.string.uuid(),
				},
			);

			expect(result).toEqual({
				ok: false,
				error: expect.objectContaining({
					name: "InvalidArgumentError",
					description: expect.stringContaining("cancelled"),
				}),
			});
		});

		it("should fail with InvalidArgumentError if the order is refunded", async () => {
			productRepository.getOrder.mockResolvedValueOnce({
				order: mock<OrderType>({
					paymentStatus: "REFUNDED",
				}),
			});

			const result = await productService.payments.initiatePaymentAttempt(
				makeMockContext(mock<User>({})),
				{
					orderId: faker.string.uuid(),
				},
			);

			expect(result).toEqual({
				ok: false,
				error: expect.objectContaining({
					name: "InvalidArgumentError",
					description: expect.stringContaining("refunded"),
				}),
			});
		});

		it("should fail with NotFoundError if the related product does not exist", async () => {
			productRepository.getOrder.mockResolvedValueOnce({
				order: mock<OrderType>({
					paymentStatus: "CREATED",
				}),
			});

			productRepository.getProduct.mockResolvedValueOnce({
				product: null,
			});

			const result = await productService.payments.initiatePaymentAttempt(
				makeMockContext(mock<User>({})),
				{
					orderId: faker.string.uuid(),
				},
			);

			expect(result).toEqual({
				ok: false,
				error: expect.objectContaining({
					name: "NotFoundError",
					description: expect.stringContaining("ProductType"),
				}),
			});
		});

		it("should fail with InternalServerError if the request to Vipps fails", async () => {
			productRepository.getOrder.mockResolvedValueOnce({
				order: mock<OrderType>({
					paymentStatus: "CREATED",
					id: faker.string.uuid(),
					attempt: 0,
				}),
			});

			productRepository.getProduct.mockResolvedValueOnce({
				product: mock<ProductType>({
					id: faker.string.uuid(),
					price: 100,
				}),
			});

			mockVippsClient.payment.create.mockResolvedValueOnce({
				ok: false,
				error: mock<EPaymentErrorResponse>({}),
			});

			const result = await productService.payments.initiatePaymentAttempt(
				makeMockContext(mock<User>({})),
				{
					orderId: faker.string.uuid(),
				},
			);

			expect(result).toEqual({
				ok: false,
				error: expect.objectContaining({
					name: "InternalServerError",
					description: expect.stringContaining("vipps"),
				}),
			});
		});
	});

	describe("#getPaymentAttempt", () => {
		it("should succeed if the user is not logged in", async () => {
			const ctx = makeMockContext(null);
			productRepository.getPaymentAttempt.mockResolvedValueOnce({
				paymentAttempt: mock<PaymentAttempt>({}),
			});

			const result = await productService.payments.get(ctx, {
				reference: faker.string.uuid(),
			});

			expect(result.ok).toBe(true);
		});

		it("should succeed if the user is logged in", async () => {
			const ctx = makeMockContext(mock<User>({}));
			productRepository.getPaymentAttempt.mockResolvedValueOnce({
				paymentAttempt: mock<PaymentAttempt>({}),
			});

			const result = await productService.payments.get(ctx, {
				reference: faker.string.uuid(),
			});

			expect(result.ok).toBe(true);
		});
	});
});

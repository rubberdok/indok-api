import { faker } from "@faker-js/faker";
import { type DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import type { User } from "~/domain/users.js";
import { makeMockContext } from "~/services/context.js";
import { type ProductRepository, ProductService } from "../../service.js";
import type { PaymentProcessingQueueType } from "../../worker.js";
import { MockVippsClientFactory } from "../mock-vipps-client.js";

describe("ProductService", () => {
	describe("#initiatePaymentAttempt", () => {
		let productService: ProductService;
		let mockProductRepository: DeepMockProxy<ProductRepository>;
		let mockPaymentProcessingQueue: DeepMockProxy<PaymentProcessingQueueType>;
		let mockClient: ReturnType<typeof MockVippsClientFactory>["client"];

		beforeAll(() => {
			const { client, factory } = MockVippsClientFactory();
			mockPaymentProcessingQueue = mockDeep<PaymentProcessingQueueType>();
			mockProductRepository = mockDeep<ProductRepository>();
			mockClient = client;
			productService = new ProductService(
				factory,
				mockPaymentProcessingQueue,
				mockProductRepository,
			);
		});

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
			mockProductRepository.getOrder.mockResolvedValueOnce({
				order: {
					attempt: 0,
					id: orderId,
					productId: faker.string.uuid(),
					version: 0,
					paymentStatus: "PENDING",
				},
			});
			mockProductRepository.getProduct.mockResolvedValueOnce({
				product: {
					id: faker.string.uuid(),
					price,
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
			mockProductRepository.createPaymentAttempt.mockResolvedValue({
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
			mockClient.payment.create.mockImplementation((_token, body) => {
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
			await productService.initiatePaymentAttempt(
				makeMockContext(
					mock<User>({
						id: faker.string.uuid(),
					}),
				),
				{
					orderId,
				},
			);

			expect(mockClient.payment.create).toHaveBeenCalledWith(
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
	});
});

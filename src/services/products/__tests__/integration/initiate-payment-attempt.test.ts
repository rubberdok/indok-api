import assert from "assert";
import { faker } from "@faker-js/faker";
import type { EPaymentGetPaymentOKResponse } from "@vippsmobilepay/sdk";
import type { QueueEvents } from "bullmq";
import { mockDeep } from "jest-mock-extended";
import { newUserFromDSO } from "~/domain/users.js";
import prisma from "~/lib/prisma.js";
import { makeMockContext } from "~/services/context.js";
import type { ProductService } from "../../service.js";
import type { PaymentProcessingQueueType } from "../../worker.js";
import type { MockVippsClientFactory } from "../mock-vipps-client.js";
import { makeDependencies } from "./deps.js";

describe("ProductService", () => {
	let productService: ProductService;
	let close: () => Promise<void>;
	let vippsMock: ReturnType<typeof MockVippsClientFactory>["client"];
	let queueEvents: QueueEvents;
	let paymentProcessingQueue: PaymentProcessingQueueType;

	beforeAll(() => {
		({ productService, close, vippsMock, queueEvents, paymentProcessingQueue } =
			makeDependencies());
	});

	afterAll(async () => {
		await close();
	});

	describe("#initiatePaymentAttempt", () => {
		it("should create a payment attempt and poll Vipps until it reaches a final state.", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create a merchant
			 * 2. Create a product
			 * 3. Create an order
			 * 4. Mock the `create` method for Vipps
			 * 5. Mock the `info` method for Vipps
			 */
			const user = await prisma.user.create({
				data: {
					id: faker.string.uuid(),
					email: faker.internet.email({ firstName: faker.string.uuid() }),
					firstName: faker.person.firstName(),
					lastName: faker.person.lastName(),
					username: faker.string.uuid(),
					feideId: faker.string.uuid(),
					isSuperUser: true,
				},
			});
			const ctx = makeMockContext(newUserFromDSO(user));
			const { merchant } = await productService.createMerchant(ctx, {
				name: faker.company.name(),
				serialNumber: faker.string.sample(6),
				subscriptionKey: faker.string.uuid(),
				clientId: faker.string.uuid(),
				clientSecret: faker.string.uuid(),
			});
			const { product } = await productService.createProduct(ctx, {
				name: faker.word.noun(),
				price: 100 * 100,
				merchantId: merchant.id,
			});
			const { order } = await productService.createOrder(ctx, {
				productId: product.id,
			});
			const reference = productService.getPaymentReference(order, 1);
			vippsMock.payment.create.mockResolvedValue({
				ok: true,
				data: {
					redirectUrl: faker.internet.url(),
					reference,
				},
			});
			vippsMock.payment.info.mockResolvedValue({
				ok: true,
				data: mockDeep<EPaymentGetPaymentOKResponse>({
					amount: {
						value: 100 * 100,
						currency: "NOK",
					},
					reference,
					state: "CREATED",
				}),
			});

			/**
			 * Act
			 *
			 * Initiate a payment attempt, which should create a payment attempt, and trigger polling.
			 */
			const result = await productService.initiatePaymentAttempt(ctx, {
				orderId: order.id,
			});

			/**
			 * Assert
			 *
			 * Initially, the payment attempt should be in progress, and the status should be CREATED.
			 */
			assert(result.ok);
			const { paymentAttempt: initialPaymentAttempt } =
				await productService.getPaymentAttempt(ctx, {
					reference,
				});
			expect(initialPaymentAttempt?.state).toBe("CREATED");
			expect(initialPaymentAttempt?.inProgress).toBe(true);

			/**
			 * Update the Vipps info mock to return a final state, authorized.
			 */
			vippsMock.payment.info.mockResolvedValue({
				ok: true,
				data: mockDeep<EPaymentGetPaymentOKResponse>({
					amount: {
						value: 100 * 100,
						currency: "NOK",
					},
					reference,
					state: "AUTHORIZED",
				}),
			});
			let pendingJobs = await paymentProcessingQueue.getRepeatableJobs();
			expect(pendingJobs).toHaveLength(1);

			await result.data.pollingJob.waitUntilFinished(queueEvents);
			const { paymentAttempt: finalPaymentAttempt } =
				await productService.getPaymentAttempt(ctx, {
					reference,
				});

			/**
			 * Assert
			 * The payment attempt should now be in a final state, and the polling job should be removed.
			 */
			expect(finalPaymentAttempt?.state).toBe("AUTHORIZED");
			expect(finalPaymentAttempt?.inProgress).toBe(false);
			expect(finalPaymentAttempt?.version).toBe(1);
			pendingJobs = await paymentProcessingQueue.getRepeatableJobs();
			expect(pendingJobs).toHaveLength(0);
		});
	});
});

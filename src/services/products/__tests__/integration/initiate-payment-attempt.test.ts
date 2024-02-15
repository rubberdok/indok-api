import assert from "assert";
import { faker } from "@faker-js/faker";
import type { EPaymentGetPaymentOKResponse } from "@vippsmobilepay/sdk";
import type { QueueEvents } from "bullmq";
import { mock, mockDeep } from "jest-mock-extended";
import { newUserFromDSO } from "~/domain/users.js";
import { makeMockContext } from "~/lib/context.js";
import prisma from "~/lib/prisma.js";
import type { ProductServiceType } from "../../service.js";
import type { PaymentProcessingQueueType } from "../../worker.js";
import type { MockVippsClientFactory } from "../mock-vipps-client.js";
import { makeDependencies } from "./deps.js";

describe("ProductService", () => {
	let productService: ProductServiceType;
	let close: () => Promise<void>;
	let vippsMock: ReturnType<typeof MockVippsClientFactory>["client"];
	let queueEvents: QueueEvents;
	let paymentProcessingQueue: PaymentProcessingQueueType;

	beforeAll(async () => {
		({ productService, close, vippsMock, queueEvents, paymentProcessingQueue } =
			await makeDependencies());
	});

	afterAll(async () => {
		await close();
	});

	describe("#initiatePaymentAttempt", () => {
		it("should create a payment attempt, start polling until a final state is reached, and when the payment attempt is AUTHORIZED, should capture payment.", async () => {
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
			const merchantResult = await productService.merchants.create(ctx, {
				name: faker.company.name(),
				serialNumber: faker.string.sample(6),
				subscriptionKey: faker.string.uuid(),
				clientId: faker.string.uuid(),
				clientSecret: faker.string.uuid(),
			});
			if (!merchantResult.ok) throw merchantResult.error;
			const productResult = await productService.products.create(ctx, {
				name: faker.word.noun(),
				price: 100 * 100,
				merchantId: merchantResult.data.merchant.id,
				description: faker.lorem.sentence(),
			});
			if (!productResult.ok) throw productResult.error;
			const orderResult = await productService.orders.create(ctx, {
				productId: productResult.data.product.id,
			});
			if (!orderResult.ok) throw orderResult.error;
			const { order } = orderResult.data;
			const reference = productService.payments.getPaymentReference(order, 1);
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
			const result = await productService.payments.initiatePaymentAttempt(ctx, {
				orderId: order.id,
				returnUrl: "https://example.com",
			});
			if (!result.ok) throw result.error;

			/**
			 * Assert
			 *
			 * Initially, the payment attempt should be in progress, and the status should be CREATED.
			 */
			const initialPaymentAttemptResult = await productService.payments.get(
				ctx,
				{
					reference,
				},
			);
			if (!initialPaymentAttemptResult.ok)
				throw initialPaymentAttemptResult.error;
			const {
				data: { paymentAttempt: initialPaymentAttempt },
			} = initialPaymentAttemptResult;
			expect(initialPaymentAttempt?.state).toBe("CREATED");
			expect(initialPaymentAttempt?.isFinalState()).toBe(false);

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
			/**
			 * Mock capture endpoint, as a payment attempt with AUTHORIZED should prompt captures.
			 */
			vippsMock.payment.capture.mockResolvedValue({
				ok: true,
				data: {
					amount: {
						value: 100 * 100,
						currency: "NOK",
					},
					state: "AUTHORIZED",
					aggregate: mock(),
					pspReference: mock(),
					reference,
				},
			});
			/**
			 * Wait for the polling job to finish
			 */
			const jobs = await paymentProcessingQueue.getJobs();
			const results = await Promise.all(
				jobs.map((job) => job.waitUntilFinished(queueEvents)),
			);
			results.map((result) => assert(result.ok));

			/**
			 *
			 */
			const finalPaymentResult = await productService.payments.get(ctx, {
				reference,
			});
			if (!finalPaymentResult.ok) throw finalPaymentResult.error;
			const {
				data: { paymentAttempt: finalPaymentAttempt },
			} = finalPaymentResult;

			/**
			 * Assert
			 * The payment attempt should now be in a final state, and the polling job should be removed.
			 */
			expect(finalPaymentAttempt?.state).toBe("AUTHORIZED");
			expect(finalPaymentAttempt?.isFinalState()).toBe(true);
			expect(finalPaymentAttempt?.version).toBe(1);
			const pendingJobs = await paymentProcessingQueue.getRepeatableJobs();
			expect(pendingJobs).toHaveLength(0);

			/**
			 * Wait for the capture job to finish up, and assert that the order is now in CAPTURED state.
			 */
			const pendingCaptureJobs = await paymentProcessingQueue.getJobs();
			await Promise.all(
				pendingCaptureJobs.map((job) => job.waitUntilFinished(queueEvents)),
			);

			const updatedOrderResult = await productService.orders.get(ctx, {
				id: order.id,
			});
			if (!updatedOrderResult.ok) throw updatedOrderResult.error;
			const { order: updatedOrder } = updatedOrderResult.data;
			expect(updatedOrder.paymentStatus).toEqual("CAPTURED");
			expect(updatedOrder.isFinalState()).toBe(true);
			expect(updatedOrder.capturedPaymentAttemptReference).toEqual(reference);
		});
	});
});

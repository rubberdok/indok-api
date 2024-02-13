import { fail } from "assert";
import { faker } from "@faker-js/faker";
import { jest } from "@jest/globals";
import { UnrecoverableError } from "bullmq";
import { type DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import {
	DownstreamServiceError,
	InternalServerError,
	InvalidArgumentError,
	NotFoundError,
} from "~/domain/errors.js";
import type { PaymentAttemptType } from "~/domain/products.js";
import type { ProductServiceType } from "../../service.js";
import type {
	PaymentProcessingQueueType,
	PaymentProcessingWorkerType,
} from "../../worker.js";
import { makeDependencies } from "./deps.js";

describe("ProductService Worker", () => {
	let close: () => Promise<void>;
	let paymentProcessingQueue: PaymentProcessingQueueType;
	let worker: PaymentProcessingWorkerType;
	let queueEvents: ReturnType<typeof makeDependencies>["queueEvents"];
	const productService: DeepMockProxy<ProductServiceType> =
		mockDeep<ProductServiceType>();

	beforeAll(() => {
		({ close, paymentProcessingQueue, worker, queueEvents } = makeDependencies({
			productService,
		}));
	});

	afterAll(async () => {
		await close();
		jest.clearAllMocks();
	});

	describe("capture-payment", () => {
		it("should throw UnrecoverableError if the capture returns InvalidArugmentError", async () => {
			// Arrange
			productService.payments.capture.mockResolvedValue({
				ok: false,
				error: new InvalidArgumentError("Invalid argument"),
			});
			let actualError: Error | undefined = undefined;
			worker.removeAllListeners();
			worker.on("failed", (_job, err) => {
				actualError = err;
			});
			// Act
			const job = await paymentProcessingQueue.add("capture-payment", {
				reference: faker.string.uuid(),
			});
			try {
				await job.waitUntilFinished(queueEvents);
				fail("Expected UnrecoverableError");
			} catch (err) {}
			while (actualError === undefined) {}
			expect(actualError).toBeInstanceOf(UnrecoverableError);
		});

		it("should throw UnrecoverableError if the capture returns InternalServerError", async () => {
			// Arrange
			productService.payments.capture.mockResolvedValue({
				ok: false,
				error: new InternalServerError("Internal server error"),
			});
			let actualError: Error | undefined = undefined;
			worker.removeAllListeners();
			worker.on("failed", (_job, err) => {
				actualError = err;
			});
			// Act
			const job = await paymentProcessingQueue.add("capture-payment", {
				reference: faker.string.uuid(),
			});
			try {
				await job.waitUntilFinished(queueEvents);
				fail("Expected UnrecoverableError");
			} catch (err) {}
			while (actualError === undefined) {}
			expect(actualError).toBeInstanceOf(UnrecoverableError);
		});

		it("should throw NotFoundError if the capture returns NotFoundError", async () => {
			// Arrange
			productService.payments.capture.mockResolvedValue({
				ok: false,
				error: new NotFoundError("Not found"),
			});
			let actualError: Error | undefined = undefined;
			worker.removeAllListeners();
			worker.on("failed", (_job, err) => {
				actualError = err;
			});
			// Act
			const job = await paymentProcessingQueue.add("capture-payment", {
				reference: faker.string.uuid(),
			});
			try {
				await job.waitUntilFinished(queueEvents);
			} catch (err) {}
			while (actualError === undefined) {}
			expect(actualError).toBeInstanceOf(NotFoundError);
		});

		it("should move job to delayed if the capture returns a DownstreamServiceError", async () => {
			// Arrange
			productService.payments.capture.mockResolvedValue({
				ok: false,
				error: new DownstreamServiceError("Downstream service error"),
			});
			worker.removeAllListeners();
			// Act
			const job = await paymentProcessingQueue.add("capture-payment", {
				reference: faker.string.uuid(),
			});
			let isDelayed = false;
			while (!isDelayed) {
				isDelayed = await job.isDelayed();
			}
			expect(isDelayed).toBe(true);
		});
	});

	describe("payment-attempt-polling", () => {
		it("should throw UnrecoverableError the payment attempt is null", async () => {
			// Arrange
			productService.payments.get.mockResolvedValue({
				ok: true,
				data: {
					paymentAttempt: mock<PaymentAttemptType>(),
				},
			});
			productService.payments.updatePaymentAttemptState.mockResolvedValue({
				ok: false,
				error: new NotFoundError("Not found"),
			});

			worker.removeAllListeners();
			worker.on("failed", (_job, err) => {
				expect(err).toBeInstanceOf(NotFoundError);
			});
			// Act
			const job = await paymentProcessingQueue.add("payment-attempt-polling", {
				reference: faker.string.uuid(),
			});
			try {
				await job.waitUntilFinished(queueEvents);
				fail("Expected UnrecoverableError");
			} catch (err) {
				expect(err).toBeInstanceOf(Error);
			}
		});

		it("should throw NotFoundError the update returns NotFoundError", async () => {
			// Arrange
			productService.payments.get.mockResolvedValue({
				ok: true,
				data: {
					paymentAttempt: mock<PaymentAttemptType>(),
				},
			});
			productService.payments.updatePaymentAttemptState.mockResolvedValue({
				ok: false,
				error: new NotFoundError("Not found"),
			});

			let actualError: Error | undefined = undefined;
			worker.removeAllListeners();
			worker.on("failed", (_job, err) => {
				actualError = err;
			});
			// Act
			const job = await paymentProcessingQueue.add("payment-attempt-polling", {
				reference: faker.string.uuid(),
			});
			try {
				await job.waitUntilFinished(queueEvents);
			} catch (err) {}
			while (actualError === undefined) {}
			expect(actualError).toBeInstanceOf(NotFoundError);
		});

		it("should throw InternalServerError the update returns InternalServerError", async () => {
			// Arrange
			productService.payments.get.mockResolvedValue({
				ok: true,
				data: {
					paymentAttempt: mock<PaymentAttemptType>(),
				},
			});
			productService.payments.updatePaymentAttemptState.mockResolvedValue({
				ok: false,
				error: new InternalServerError("ISE"),
			});
			let actualError: Error | undefined = undefined;
			worker.removeAllListeners();
			worker.on("failed", (_job, err) => {
				actualError = err;
			});
			// Act
			const job = await paymentProcessingQueue.add("payment-attempt-polling", {
				reference: faker.string.uuid(),
			});
			try {
				await job.waitUntilFinished(queueEvents);
			} catch (err) {}
			while (actualError === undefined) {}
			expect(actualError).toBeInstanceOf(InternalServerError);
		});

		it("should move job to delayed if a DownstreamServiceError is returned", async () => {
			// Arrange
			productService.payments.get.mockResolvedValue({
				ok: true,
				data: {
					paymentAttempt: mock<PaymentAttemptType>(),
				},
			});
			productService.payments.updatePaymentAttemptState.mockResolvedValue({
				ok: false,
				error: new DownstreamServiceError("Downstream"),
			});
			worker.removeAllListeners();
			// Act
			const job = await paymentProcessingQueue.add("payment-attempt-polling", {
				reference: faker.string.uuid(),
			});
			let isDelayed = false;
			while (!isDelayed) {
				isDelayed = await job.isDelayed();
			}
			expect(isDelayed).toBe(true);
		});
	});
});

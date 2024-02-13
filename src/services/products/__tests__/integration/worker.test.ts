import { fail } from "assert";
import { faker } from "@faker-js/faker";
import { UnrecoverableError } from "bullmq";
import { type DeepMockProxy, mockDeep } from "jest-mock-extended";
import {
	DownstreamServiceError,
	InternalServerError,
	InvalidArgumentError,
	NotFoundError,
} from "~/domain/errors.js";
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
	});

	describe("capture-payment", () => {
		it("should throw UnrecoverableError if the capture returns InvalidArugmentError", async () => {
			// Arrange
			productService.payments.capture.mockResolvedValue({
				ok: false,
				error: new InvalidArgumentError("Invalid argument"),
			});
			worker.removeAllListeners();
			worker.on("failed", (_job, err) => {
				expect(err).toBeInstanceOf(UnrecoverableError);
			});
			// Act
			const job = await paymentProcessingQueue.add("capture-payment", {
				reference: faker.string.uuid(),
			});
			try {
				await job.waitUntilFinished(queueEvents);
				fail("Expected UnrecoverableError");
			} catch (err) {
				expect(err).toBeInstanceOf(Error);
			}
		});

		it("should throw UnrecoverableError if the capture returns InternalServerError", async () => {
			// Arrange
			productService.payments.capture.mockResolvedValue({
				ok: false,
				error: new InternalServerError("Internal server error"),
			});
			worker.removeAllListeners();
			worker.on("failed", (_job, err) => {
				expect(err).toBeInstanceOf(UnrecoverableError);
			});
			// Act
			const job = await paymentProcessingQueue.add("capture-payment", {
				reference: faker.string.uuid(),
			});
			try {
				await job.waitUntilFinished(queueEvents);
				fail("Expected UnrecoverableError");
			} catch (err) {
				expect(err).toBeInstanceOf(Error);
			}
		});

		it("should throw NotFoundError if the capture returns NotFoundError", async () => {
			// Arrange
			productService.payments.capture.mockResolvedValue({
				ok: false,
				error: new NotFoundError("Not found"),
			});
			worker.removeAllListeners();
			worker.on("failed", (_job, err) => {
				expect(err).toBeInstanceOf(NotFoundError);
			});
			// Act
			const job = await paymentProcessingQueue.add("capture-payment", {
				reference: faker.string.uuid(),
			});
			try {
				await job.waitUntilFinished(queueEvents);
			} catch (err) {
				expect(err).toBeInstanceOf(Error);
			}
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
});

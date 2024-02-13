import { faker } from "@faker-js/faker";
import { jest } from "@jest/globals";
import { type DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import { DownstreamServiceError } from "~/domain/errors.js";
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
	let queueEvents: Awaited<ReturnType<typeof makeDependencies>>["queueEvents"];
	let productService: DeepMockProxy<ProductServiceType>;

	beforeEach(async () => {
		productService = mockDeep<ProductServiceType>({});
		({ close, paymentProcessingQueue, worker, queueEvents } =
			await makeDependencies({
				productService,
			}));
	});

	afterEach(async () => {
		await close();
		jest.clearAllMocks();
	});

	describe("capture-payment", () => {
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

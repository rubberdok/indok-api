import { mockDeep } from "jest-mock-extended";
import { type ProductRepository, ProductService } from "../../service.js";
import type { PaymentProcessingQueueType } from "../../worker.js";
import { MockVippsClientFactory } from "../mock-vipps-client.js";

function makeDependencies() {
	const { client, factory } = MockVippsClientFactory();
	const mockVippsClient = client;
	const productRepository = mockDeep<ProductRepository>();
	const mockPaymentProcessingQueue = mockDeep<PaymentProcessingQueueType>();
	const productService = new ProductService(
		factory,
		mockPaymentProcessingQueue,
		productRepository,
	);
	return {
		mockVippsClient,
		productRepository,
		productService,
		mockPaymentProcessingQueue,
	};
}

export { makeDependencies };

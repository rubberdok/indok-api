import { mockDeep } from "jest-mock-extended";
import {
	type MailService,
	type ProductRepository,
	ProductService,
} from "../../service.js";
import type { PaymentProcessingQueueType } from "../../worker.js";
import { MockVippsClientFactory } from "../mock-vipps-client.js";

function makeDependencies() {
	const { client, factory } = MockVippsClientFactory();
	const mockVippsClient = client;
	const productRepository = mockDeep<ProductRepository>();
	const mockPaymentProcessingQueue = mockDeep<PaymentProcessingQueueType>();
	const mockMailService = mockDeep<MailService>();
	const productService = ProductService({
		vippsFactory: factory,
		paymentProcessingQueue: mockPaymentProcessingQueue,
		productRepository,
		mailService: mockMailService,
		config: {
			useTestMode: true,
			returnUrl: "http://localhost:3000",
		},
	});
	return {
		mockVippsClient,
		productRepository,
		productService,
		mockPaymentProcessingQueue,
		mockMailService,
	};
}

export { makeDependencies };

import type { Client } from "@vippsmobilepay/sdk";
import type { InternalServerError } from "~/domain/errors.js";
import type {
	MerchantType,
	OrderType,
	PaymentAttempt,
	ProductType,
} from "~/domain/products.js";
import type { ResultAsync } from "~/lib/result.js";
import { buildMerchants } from "./merchants.js";
import { buildOrders } from "./orders.js";
import { buildPayments } from "./payments.js";
import { buildProducts } from "./products.js";
import type { PaymentProcessingQueueType } from "./worker.js";

interface ProductRepository {
	getProduct(id: string): Promise<{ product: ProductType | null }>;
	getOrder(
		id: string,
	): ResultAsync<{ order: OrderType | null }, InternalServerError>;
	createOrder(order: {
		userId: string;
		product: {
			id: string;
			version: number;
		};
	}): Promise<{ order: OrderType; product: ProductType }>;
	createPaymentAttempt(params: {
		order: {
			id: string;
			version: number;
		};
		reference: string;
	}): Promise<{ paymentAttempt: PaymentAttempt; order: OrderType }>;
	getPaymentAttempt(
		by: { id: string } | { reference: string },
	): ResultAsync<
		{ paymentAttempt: PaymentAttempt | null },
		InternalServerError
	>;
	updatePaymentAttempt(
		paymentAttempt: Pick<PaymentAttempt, "id" | "version" | "state">,
		order: Pick<OrderType, "id" | "version" | "paymentStatus">,
	): Promise<{ paymentAttempt: PaymentAttempt; order: OrderType }>;
	getProducts(): Promise<{ products: ProductType[]; total: number }>;
	createProduct(product: {
		name: string;
		price: number;
		merchantId: string;
	}): Promise<{ product: ProductType }>;
	createMerchant(merchant: {
		name: string;
		serialNumber: string;
		subscriptionKey: string;
		clientId: string;
		clientSecret: string;
	}): Promise<{ merchant: MerchantType }>;
}

type BuildProductsDependencies = {
	vippsFactory: typeof Client;
	paymentProcessingQueue: PaymentProcessingQueueType;
	productRepository: ProductRepository;
	config: {
		returnUrl: string;
		useTestMode?: boolean;
	};
};

type ProductServiceType = ReturnType<typeof ProductService>;

function ProductService(dependencies: BuildProductsDependencies) {
	return {
		products: buildProducts(dependencies),
		merchants: buildMerchants(dependencies),
		payments: buildPayments(dependencies),
		orders: buildOrders(dependencies),
	} as const;
}

export { ProductService };
export type {
	ProductServiceType,
	ProductRepository,
	BuildProductsDependencies,
};

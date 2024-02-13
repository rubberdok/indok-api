import type { Client } from "@vippsmobilepay/sdk";
import type { InternalServerError, NotFoundError } from "~/domain/errors.js";
import type {
	MerchantType,
	OrderPaymentStatus,
	OrderType,
	PaymentAttemptType,
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
	updateOrder(params: {
		id: string;
		version: number;
		paymentStatus: OrderPaymentStatus;
	}): ResultAsync<{ order: OrderType }, NotFoundError | InternalServerError>;
	findManyOrders(params?: { userId?: string; productId?: string }): ResultAsync<
		{ orders: OrderType[]; total: number },
		InternalServerError
	>;
	createOrder(order: {
		userId: string;
		product: {
			id: string;
			version: number;
		};
		totalPrice: number;
	}): Promise<{ order: OrderType; product: ProductType }>;
	createPaymentAttempt(params: {
		order: {
			id: string;
			version: number;
		};
		reference: string;
	}): Promise<{ paymentAttempt: PaymentAttemptType; order: OrderType }>;
	getPaymentAttempt(
		by: { id: string } | { reference: string },
	): ResultAsync<
		{ paymentAttempt: PaymentAttemptType | null },
		InternalServerError
	>;
	findManyPaymentAttempts(params?: {
		userId?: string;
		orderId?: string;
		productId?: string;
	}): ResultAsync<
		{ paymentAttempts: PaymentAttemptType[]; total: number },
		InternalServerError
	>;
	updatePaymentAttempt(
		paymentAttempt: Pick<PaymentAttemptType, "id" | "version" | "state">,
		order: Pick<OrderType, "id" | "version">,
	): Promise<{ paymentAttempt: PaymentAttemptType; order: OrderType }>;
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
	getMerchant(
		by: { productId: string } | { id: string } | { orderId: string },
	): ResultAsync<
		{ merchant: MerchantType },
		NotFoundError | InternalServerError
	>;
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

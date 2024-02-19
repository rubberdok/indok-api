import type { Client } from "@vippsmobilepay/sdk";
import type { InternalServerError, NotFoundError } from "~/domain/errors.js";
import type {
	MerchantType,
	OrderType,
	PaymentAttemptType,
	ProductType,
} from "~/domain/products.js";
import type { Context } from "~/lib/context.js";
import type { ResultAsync, TResult } from "~/lib/result.js";
import type { EmailQueueDataType } from "../mail/worker.js";
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
	updateOrder(
		params: {
			id: string;
		},
		updateOrderFn: (order: OrderType) => TResult<{ order: OrderType }, never>,
	): ResultAsync<{ order: OrderType }, NotFoundError | InternalServerError>;
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
		order: Pick<OrderType, "id" | "version" | "paymentStatus">,
	): ResultAsync<
		{ paymentAttempt: PaymentAttemptType; order: OrderType },
		InternalServerError | NotFoundError
	>;
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
		by: { productId: string } | { merchantId: string } | { orderId: string },
	): ResultAsync<
		{ merchant: MerchantType },
		NotFoundError | InternalServerError
	>;
	findManyMerchants(
		ctx: Context,
	): ResultAsync<
		{ merchants: MerchantType[]; total: number },
		InternalServerError
	>;
}

export interface MailService {
	sendAsync(jobData: EmailQueueDataType): Promise<void>;
}

type BuildProductsDependencies = {
	vippsFactory: typeof Client;
	paymentProcessingQueue: PaymentProcessingQueueType;
	productRepository: ProductRepository;
	mailService: MailService;
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

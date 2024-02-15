export type {
	OrderType as OrderMapper,
	ProductType as ProductMapper,
	MerchantType as MerchantMapper,
	PaymentAttemptType as PaymentAttemptMapper,
} from "~/domain/products.js";

type PriceMapper = {
	value: number;
	unit: string;
};

export type { PriceMapper };

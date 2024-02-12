import { faker } from "@faker-js/faker";
import type { Prisma, PrismaClient } from "@prisma/client";
import { env } from "~/config.js";
import type { MerchantType } from "~/domain/products.js";

faker.seed(12334143143);

const products: Prisma.ProductCreateInput[] = [
	{
		id: faker.string.uuid(),
		price: 100 * 100,
		description: faker.lorem.sentence(),
		name: faker.commerce.productName(),
		merchant: {
			connect: {
				clientId: env.VIPPS_DEFAULT_CLIENT_ID,
			},
		},
	},
];

const load = async (db: PrismaClient) => {
	let merchant: MerchantType | null = null;
	if (
		env.VIPPS_DEFAULT_CLIENT_ID &&
		env.VIPPS_DEFAULT_CLIENT_SECRET &&
		env.VIPPS_DEFAULT_MERCHANT_SERIAL_NUMBER &&
		env.VIPPS_DEFAULT_SUBSCRIPTION_KEY
	) {
		const defaultMerchant: Prisma.MerchantCreateInput = {
			name: faker.company.name(),
			clientId: env.VIPPS_DEFAULT_CLIENT_ID,
			clientSecret: env.VIPPS_DEFAULT_CLIENT_SECRET,
			serialNumber: env.VIPPS_DEFAULT_MERCHANT_SERIAL_NUMBER,
			subscriptionKey: env.VIPPS_DEFAULT_SUBSCRIPTION_KEY,
		};

		merchant = await db.merchant.upsert({
			where: {
				clientId: defaultMerchant.clientId,
			},
			update: defaultMerchant,
			create: defaultMerchant,
		});
	}

	for (const product of products) {
		await db.product.upsert({
			where: {
				id: product.id,
			},
			update: product,
			create: product,
		});
	}

	const allProducts = await db.product.findMany();

	return {
		products: allProducts,
		merchant,
	};
};

export { load };

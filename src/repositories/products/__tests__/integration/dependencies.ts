import { randomUUID } from "node:crypto";
import { faker } from "@faker-js/faker";
import prisma from "~/lib/prisma.js";
import { UserRepository } from "~/repositories/users/index.js";
import { ProductRepository } from "../../repository.js";

async function makeDependencies() {
	const userRepository = new UserRepository(prisma);
	const productRepository = new ProductRepository(prisma);
	const user = await userRepository.create({
		firstName: faker.person.firstName(),
		lastName: faker.person.lastName(),
		email: faker.internet.email({ firstName: faker.string.uuid() }),
		feideId: faker.string.uuid(),
		username: faker.string.uuid(),
	});

	const { merchant } = await productRepository.createMerchant({
		clientId: randomUUID(),
		clientSecret: faker.string.uuid(),
		name: faker.company.name(),
		serialNumber: faker.string.uuid(),
		subscriptionKey: faker.string.uuid(),
	});

	const createProduct = await productRepository.createProduct({
		merchantId: merchant.id,
		price: 100,
		name: faker.commerce.productName(),
	});

	const { order } = await productRepository.createOrder({
		userId: user.id,
		product: createProduct.product,
		totalPrice: createProduct.product.price,
	});

	const { product } = await productRepository.getProduct(
		createProduct.product.id,
	);

	if (!product) {
		throw new Error("Product not found");
	}

	return { user, merchant, product, order, productRepository };
}

export { makeDependencies };

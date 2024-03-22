import assert, { fail } from "node:assert";
import { faker } from "@faker-js/faker";
import { InvalidArgumentError, NotFoundError } from "~/domain/errors.js";
import { makeMockContext } from "~/lib/context.js";
import { Result } from "~/lib/result.js";
import { makeDependencies } from "./dependencies.js";

describe("productRepository", () => {
	describe("merchant", () => {
		describe("#createMerchant", () => {
			it("creates a merchant", async () => {
				const { productRepository } = await makeDependencies();
				const actual = await productRepository.createMerchant({
					clientId: faker.string.uuid(),
					clientSecret: faker.string.uuid(),
					name: faker.company.name(),
					serialNumber: faker.string.uuid(),
					subscriptionKey: faker.string.uuid(),
				});
				expect(actual.merchant).toBeDefined();
			});

			it("raises InvalidArgumentError if a merchant with a duplicate clientId already exists", async () => {
				const { merchant: existing, productRepository } =
					await makeDependencies();

				try {
					await productRepository.createMerchant({
						clientId: existing.clientId,
						clientSecret: faker.string.uuid(),
						name: faker.company.name(),
						serialNumber: faker.string.uuid(),
						subscriptionKey: faker.string.uuid(),
					});
					fail("Expected InvalidArgumentError to be raised");
				} catch (err) {
					expect(err).toBeInstanceOf(InvalidArgumentError);
				}
			});
		});

		describe("#updateMerchant", () => {
			it("updates a merchant", async () => {
				const { merchant: existing, productRepository } =
					await makeDependencies();

				const newClientSecret = faker.string.uuid();
				const newClientId = faker.string.uuid();
				const actual = await productRepository.updateMerchant({
					id: existing.id,
					clientId: newClientId,
					clientSecret: newClientSecret,
					name: faker.company.name(),
					serialNumber: faker.string.uuid(),
					subscriptionKey: faker.string.uuid(),
				});

				expect(actual.merchant).toBeDefined();
				expect(actual.merchant.clientId).toEqual(newClientId);
				expect(actual.merchant.clientSecret).toEqual(newClientSecret);
			});

			it("updates a merchant", async () => {
				const { merchant: existing, productRepository } =
					await makeDependencies();

				const toUpdate = await productRepository.createMerchant({
					clientId: faker.string.uuid(),
					clientSecret: faker.string.uuid(),
					name: faker.string.uuid(),
					serialNumber: faker.string.uuid(),
					subscriptionKey: faker.string.uuid(),
				});
				try {
					await productRepository.updateMerchant({
						id: toUpdate.merchant.id,
						clientId: existing.clientId,
						clientSecret: faker.string.uuid(),
						name: faker.string.uuid(),
						serialNumber: faker.string.uuid(),
						subscriptionKey: faker.string.uuid(),
					});
					fail("Expected InvalidArgumentError to be raised");
				} catch (err) {
					expect(err).toBeInstanceOf(InvalidArgumentError);
				}
			});
		});

		describe("#getMerchant", () => {
			it("returns a merchant by merchant id", async () => {
				const { merchant, productRepository } = await makeDependencies();

				const actual = await productRepository.getMerchant({
					merchantId: merchant.id,
				});

				if (!actual.ok) throw actual.error;
				expect(actual.data.merchant).toEqual(merchant);
			});

			it("returns a merchant by product id", async () => {
				const { productRepository, product, merchant } =
					await makeDependencies();

				const actual = await productRepository.getMerchant({
					productId: product.id,
				});

				if (!actual.ok) throw actual.error;
				expect(actual.data.merchant).toEqual(merchant);
			});

			it("returns a merchant by order id", async () => {
				const { productRepository, order, merchant } = await makeDependencies();

				const actual = await productRepository.getMerchant({
					orderId: order.id,
				});

				if (!actual.ok) throw actual.error;
				expect(actual.data.merchant).toEqual(merchant);
			});

			it("returns NotFoundError if the merchant does not exist", async () => {
				const { productRepository } = await makeDependencies();

				const actual = await productRepository.getMerchant({
					merchantId: faker.string.uuid(),
				});

				assert(!actual.ok, "Expected NotFoundError to be returned");
				expect(actual.error).toBeInstanceOf(NotFoundError);
			});
		});

		describe("#findManyMerchants", () => {
			it("returns merchants and the total count", async () => {
				const { productRepository, merchant } = await makeDependencies();

				const actual = await productRepository.findManyMerchants(
					makeMockContext(),
				);

				expect(actual).toEqual(
					Result.success({
						merchants: expect.arrayContaining([merchant]),
						total: expect.any(Number),
					}),
				);
			});
		});
	});
});

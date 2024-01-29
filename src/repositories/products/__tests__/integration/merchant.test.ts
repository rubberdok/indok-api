import { fail } from "assert";
import { faker } from "@faker-js/faker";
import { InvalidArgumentError } from "~/domain/errors.js";
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
					name: faker.company.name(),
					serialNumber: faker.string.uuid(),
					subscriptionKey: faker.string.uuid(),
				});
				try {
					await productRepository.updateMerchant({
						id: toUpdate.merchant.id,
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
	});
});

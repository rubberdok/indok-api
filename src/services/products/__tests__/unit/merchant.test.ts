import { mock } from "jest-mock-extended";
import { UnauthorizedError } from "~/domain/errors.js";
import type { MerchantType } from "~/domain/products.js";
import type { User } from "~/domain/users.js";
import { makeMockContext } from "~/services/context.js";
import { makeDependencies } from "./dependencies.js";

describe("ProductService", () => {
	const { productService, productRepository } = makeDependencies();

	describe("#createMerchant", () => {
		it("should fail if the user is not a super user", async () => {
			const ctx = makeMockContext(mock<User>({ isSuperUser: false }));

			const result = await productService.merchants.create(ctx, {
				name: "Test",
				serialNumber: "123456",
				subscriptionKey: "123456",
				clientId: "123456",
				clientSecret: "123456",
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(UnauthorizedError),
			});
			expect(productRepository.createMerchant).not.toHaveBeenCalled();
		});

		it("should succeed if the user is a super user", async () => {
			const ctx = makeMockContext(mock<User>({ isSuperUser: true }));
			productRepository.createMerchant.mockResolvedValueOnce({
				merchant: mock<MerchantType>({}),
			});

			const result = await productService.merchants.create(ctx, {
				name: "Test",
				serialNumber: "123456",
				subscriptionKey: "123456",
				clientId: "123456",
				clientSecret: "123456",
			});

			expect(result.ok).toBe(true);
			expect(productRepository.createMerchant).toHaveBeenCalled();
		});
	});
});

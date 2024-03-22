import { faker } from "@faker-js/faker";
import { UnauthorizedError } from "~/domain/errors.js";
import { makeMockContext } from "~/lib/context.js";
import { Result } from "~/lib/result.js";
import { makeDependencies } from "./dependencies.js";

describe("Product service", () => {
	describe("#merchants.findMany", () => {
		it("returns UnauthorizedError if not logged in", async () => {
			const { productService } = makeDependencies();

			const result = await productService.merchants.findMany(
				makeMockContext(null),
			);

			expect(result).toEqual(Result.error(expect.any(UnauthorizedError)));
		});

		it("returns merchants and count", async () => {
			const { productService, productRepository } = makeDependencies();

			productRepository.findManyMerchants.mockResolvedValue(
				Result.success({
					merchants: [],
					total: 0,
				}),
			);
			const result = await productService.merchants.findMany(
				makeMockContext({ id: faker.string.uuid() }),
			);

			expect(result).toEqual(
				Result.success({
					merchants: [],
					total: 0,
				}),
			);
		});
	});
});

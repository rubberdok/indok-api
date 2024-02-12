import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import { PermissionDeniedError, UnauthorizedError } from "~/domain/errors.js";
import type { OrderType, ProductType } from "~/domain/products.js";
import type { User } from "~/domain/users.js";
import { makeMockContext } from "~/lib/context.js";
import { makeDependencies } from "./dependencies.js";

describe("OrderService", () => {
	const { productService, productRepository } = makeDependencies();

	describe("#createOrder", () => {
		it("should fail if the user is not logged in", async () => {
			const ctx = makeMockContext(null);

			const result = await productService.orders.create(ctx, {
				productId: "123456",
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(UnauthorizedError),
			});
		});

		it("should succeed if the user is logged in", async () => {
			const ctx = makeMockContext(mock<User>({}));
			productRepository.getProduct.mockResolvedValueOnce({
				product: mock<ProductType>({}),
			});
			productRepository.createOrder.mockResolvedValueOnce({
				order: mock<OrderType>({}),
				product: mock<ProductType>({}),
			});

			const result = await productService.orders.create(ctx, {
				productId: "123456",
			});

			expect(result.ok).toBe(true);
			expect(productRepository.createOrder).toHaveBeenCalled();
		});
	});

	describe("#findMany", () => {
		it("should return all orders as a super user", async () => {
			const ctx = makeMockContext(mock<User>({ isSuperUser: true }));

			await productService.orders.findMany(ctx);

			expect(productRepository.findManyOrders).toHaveBeenCalledWith(undefined);
		});

		it("should return all orders for a user as a super user", async () => {
			const ctx = makeMockContext(mock<User>({ isSuperUser: true }));

			const userId = faker.string.uuid();
			await productService.orders.findMany(ctx, { userId });

			expect(productRepository.findManyOrders).toHaveBeenCalledWith({ userId });
		});

		it("should return all orders for a product as a super user", async () => {
			const ctx = makeMockContext(mock<User>({ isSuperUser: true }));

			const productId = faker.string.uuid();
			await productService.orders.findMany(ctx, { productId });

			expect(productRepository.findManyOrders).toHaveBeenCalledWith({
				productId,
			});
		});

		it("should only return your own orders for a product as a regular user", async () => {
			const user = mock<User>({ id: faker.string.uuid(), isSuperUser: false });
			const ctx = makeMockContext(user);

			const productId = faker.string.uuid();
			await productService.orders.findMany(ctx, { productId });

			expect(productRepository.findManyOrders).toHaveBeenCalledWith({
				productId,
				userId: user.id,
			});
		});

		it("should only return your own orders as a regular user", async () => {
			const user = mock<User>({ id: faker.string.uuid(), isSuperUser: false });
			const ctx = makeMockContext(user);

			await productService.orders.findMany(ctx);

			expect(productRepository.findManyOrders).toHaveBeenCalledWith({
				userId: user.id,
			});
		});

		it("should return PermissionDeniedError if you try to fetch orders for a different user as a regular user", async () => {
			const user = mock<User>({ id: faker.string.uuid(), isSuperUser: false });
			const ctx = makeMockContext(user);

			const result = await productService.orders.findMany(ctx, {
				userId: faker.string.uuid(),
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(PermissionDeniedError),
			});
		});

		it("should return UnauthorizedError if not logged in", async () => {
			const ctx = makeMockContext(null);

			const result = await productService.orders.findMany(ctx, {
				userId: faker.string.uuid(),
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(UnauthorizedError),
			});
		});
	});
});

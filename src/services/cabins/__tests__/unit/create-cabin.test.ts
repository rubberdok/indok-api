import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import type { Cabin } from "~/domain/cabins.js";
import {
	DomainErrorType,
	InternalServerError,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
import { makeMockContext } from "~/lib/context.js";
import { makeDependencies } from "./dependencies.js";

describe("CabinService", () => {
	describe("#createCabin", () => {
		it("should return UnauthorizedError if not logged in", async () => {
			const { cabinService } = makeDependencies();
			const result = await cabinService.createCabin(makeMockContext(null), {
				name: "test",
				capacity: 10,
				internalPrice: 100,
				externalPrice: 200,
				internalPriceWeekend: 150,
				externalPriceWeekend: 250,
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(UnauthorizedError),
			});
		});

		it("returns PermissionDeniedError if the user does not have CABIN_ADMIN permission", async () => {
			const { cabinService, permissionService } = makeDependencies();
			permissionService.hasFeaturePermission.mockResolvedValueOnce(false);

			const result = await cabinService.createCabin(
				makeMockContext({ id: faker.string.uuid() }),
				{
					name: "test",
					capacity: 10,
					internalPrice: 100,
					externalPrice: 200,
					internalPriceWeekend: 150,
					externalPriceWeekend: 250,
				},
			);

			expect(result).toEqual({
				ok: false,
				error: expect.any(PermissionDeniedError),
			});
		});

		it("should create a cabin", async () => {
			const { cabinService, permissionService, cabinRepository } =
				makeDependencies();
			permissionService.hasFeaturePermission.mockResolvedValueOnce(true);
			cabinRepository.createCabin.mockResolvedValueOnce({
				ok: true,
				data: {
					cabin: mock<Cabin>({
						id: faker.string.uuid(),
						name: "test",
						capacity: 10,
						internalPrice: 100,
						externalPrice: 200,
						internalPriceWeekend: 150,
						externalPriceWeekend: 250,
					}),
				},
			});

			const result = await cabinService.createCabin(
				makeMockContext({ id: faker.string.uuid() }),
				{
					name: "test",
					capacity: 10,
					internalPrice: 100,
					externalPrice: 200,
					internalPriceWeekend: 150,
					externalPriceWeekend: 250,
				},
			);

			expect(result.ok).toBe(true);
		});

		it("checks for the CABIN_ADMIN permission", async () => {
			const { cabinService, permissionService } = makeDependencies();
			const ctx = makeMockContext({ id: faker.string.uuid() });
			await cabinService.createCabin(ctx, {
				name: "test",
				capacity: 10,
				internalPrice: 100,
				externalPrice: 200,
				internalPriceWeekend: 150,
				externalPriceWeekend: 250,
			});

			expect(permissionService.hasFeaturePermission).toHaveBeenCalledWith(ctx, {
				featurePermission: "CABIN_ADMIN",
			});
		});

		it("returns InvalidArgumentError for invalid input", async () => {
			const { cabinService, permissionService } = makeDependencies();
			permissionService.hasFeaturePermission.mockResolvedValueOnce(true);
			const ctx = makeMockContext({ id: faker.string.uuid() });

			const result = await cabinService.createCabin(ctx, {
				name: "",
				capacity: -1,
				internalPrice: -1,
				externalPrice: -1,
				internalPriceWeekend: -1,
				externalPriceWeekend: -1,
			});

			expect(result).toEqual({
				ok: false,
				error: expect.objectContaining({
					type: DomainErrorType.InvalidArgumentError,
					reason: {
						capacity: expect.any(Array),
						internalPrice: expect.any(Array),
						externalPrice: expect.any(Array),
						internalPriceWeekend: expect.any(Array),
						externalPriceWeekend: expect.any(Array),
						name: expect.any(Array),
					},
				}),
			});
		});

		it("returns InternalServerError if the repository fails unexpectedly", async () => {
			const { cabinService, permissionService, cabinRepository } =
				makeDependencies();
			permissionService.hasFeaturePermission.mockResolvedValueOnce(true);
			cabinRepository.createCabin.mockResolvedValueOnce({
				ok: false,
				error: new InternalServerError(""),
			});
			const ctx = makeMockContext({ id: faker.string.uuid() });

			const result = await cabinService.createCabin(ctx, {
				name: faker.word.adjective(),
				capacity: 20,
				internalPrice: 10,
				externalPrice: 10,
				internalPriceWeekend: 10,
				externalPriceWeekend: 10,
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(InternalServerError),
			});
		});
	});
});

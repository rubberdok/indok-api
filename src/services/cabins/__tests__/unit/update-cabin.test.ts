import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import type { Cabin } from "~/domain/cabins.js";
import {
	InternalServerError,
	type InvalidArgumentErrorV2,
	NotFoundError,
	PermissionDeniedError,
	UnauthorizedError,
	errorCodes,
} from "~/domain/errors.js";
import type { User } from "~/domain/users.js";
import { makeMockContext } from "~/lib/context.js";
import { Result } from "~/lib/result.js";
import type { CabinService } from "../../index.js";
import type { ICabinRepository } from "../../service.js";
import { makeDependencies } from "./dependencies.js";

type UpdateCabinInput = Parameters<CabinService["updateCabin"]>[1];

describe("Cabin Service", () => {
	describe("#updateCabin", () => {
		interface TestCase {
			name: string;
			input: UpdateCabinInput;
			user: Partial<User> | null;
			hasFeaturePermission: boolean;
			expected: Awaited<ReturnType<CabinService["updateCabin"]>>;
			repositoryResult?: Awaited<ReturnType<ICabinRepository["updateCabin"]>>;
		}

		const testCases: TestCase[] = [
			{
				name: "returns UnauthorizedError if not logged in",
				input: {
					id: faker.string.uuid(),
				},
				user: null,
				hasFeaturePermission: true,
				expected: {
					ok: false,
					error: expect.any(UnauthorizedError),
				},
			},
			{
				name: "returns PermissionDeniedError if user does not have permission",
				input: {
					id: faker.string.uuid(),
				},
				user: { id: faker.string.uuid() },
				hasFeaturePermission: false,
				expected: {
					ok: false,
					error: expect.any(PermissionDeniedError),
				},
			},
			{
				name: "returns InvalidArgumentError if capacity is negative",
				input: {
					id: faker.string.uuid(),
					capacity: -1,
				},
				user: { id: faker.string.uuid() },
				hasFeaturePermission: true,
				expected: {
					ok: false,
					error: expect.objectContaining<Partial<InvalidArgumentErrorV2>>({
						code: errorCodes.ERR_BAD_USER_INPUT,
						reason: expect.objectContaining({
							capacity: expect.any(Array),
						}),
					}),
				},
			},
			{
				name: "returns InvalidArgumentError if any price is negative",
				input: {
					id: faker.string.uuid(),
					internalPrice: -1,
					externalPrice: -1,
					externalPriceWeekend: -1,
					internalPriceWeekend: -1,
				},
				user: { id: faker.string.uuid() },
				hasFeaturePermission: true,
				expected: {
					ok: false,
					error: expect.objectContaining<Partial<InvalidArgumentErrorV2>>({
						code: errorCodes.ERR_BAD_USER_INPUT,
						reason: expect.objectContaining({
							internalPrice: expect.any(Array),
							externalPrice: expect.any(Array),
							externalPriceWeekend: expect.any(Array),
							internalPriceWeekend: expect.any(Array),
						}),
					}),
				},
			},
			{
				name: "returns InvalidArgumentError if name is empty",
				input: {
					id: faker.string.uuid(),
					name: "",
				},
				user: { id: faker.string.uuid() },
				hasFeaturePermission: true,
				expected: {
					ok: false,
					error: expect.objectContaining<Partial<InvalidArgumentErrorV2>>({
						code: errorCodes.ERR_BAD_USER_INPUT,
						reason: expect.objectContaining({
							name: expect.any(Array),
						}),
					}),
				},
			},
			{
				name: "returns NotFoundError if the cabin does not exist",
				input: {
					id: faker.string.uuid(),
				},
				user: { id: faker.string.uuid() },
				hasFeaturePermission: true,
				repositoryResult: Result.error(new NotFoundError("")),
				expected: {
					ok: false,
					error: expect.any(NotFoundError),
				},
			},
			{
				name: "returns InternalServerError if an unexpected error occurs",
				input: {
					id: faker.string.uuid(),
				},
				user: { id: faker.string.uuid() },
				hasFeaturePermission: true,
				repositoryResult: Result.error(new InternalServerError("")),
				expected: {
					ok: false,
					error: expect.any(InternalServerError),
				},
			},
			{
				name: "updates the cabin",
				input: {
					id: faker.string.uuid(),
					name: faker.word.adjective(),
				},
				user: { id: faker.string.uuid() },
				hasFeaturePermission: true,
				repositoryResult: Result.success({
					cabin: { id: faker.string.uuid() } as Cabin,
				}),
				expected: {
					ok: true,
					data: expect.objectContaining({
						cabin: expect.anything(),
					}),
				},
			},
		];

		test.each(testCases)(
			"$name",
			async ({
				input,
				expected,
				hasFeaturePermission,
				user,
				repositoryResult,
			}) => {
				/**
				 * Arrange
				 */
				const { cabinService, permissionService, cabinRepository } =
					makeDependencies();

				permissionService.hasFeaturePermission.mockResolvedValue(
					hasFeaturePermission,
				);
				cabinRepository.updateCabin.mockResolvedValue(
					repositoryResult ?? mock(),
				);
				const ctx = makeMockContext(user);

				/**
				 * Act
				 */
				const result = await cabinService.updateCabin(ctx, input);

				/**
				 * Assert
				 */
				expect(result).toEqual(expected);
			},
		);

		it("requires CABIN_ADMIN permission", async () => {
			const { cabinService, permissionService } = makeDependencies();
			const user = { id: faker.string.uuid() };
			const ctx = makeMockContext(user);
			await cabinService.updateCabin(ctx, { id: faker.string.uuid() });
			expect(permissionService.hasFeaturePermission).toHaveBeenCalledWith(
				expect.objectContaining({
					user: expect.objectContaining({ id: user.id }),
				}),
				{ featurePermission: "CABIN_ADMIN" },
			);
		});
	});
});

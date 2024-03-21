import { type DeepMockProxy, mock } from "jest-mock-extended";
import type { BookingType } from "~/domain/cabins.js";
import {
	InternalServerError,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
import { FeaturePermission } from "~/domain/organizations.js";
import { makeMockContext } from "~/lib/context.js";
import type {
	CabinService,
	ICabinRepository,
	PermissionService,
} from "../../service.js";
import { makeDependencies } from "./dependencies.js";

describe("CabinService", () => {
	let cabinService: CabinService;
	let mockCabinRepository: DeepMockProxy<ICabinRepository>;
	let mockPermissionService: DeepMockProxy<PermissionService>;

	beforeAll(() => {
		({
			cabinService,
			cabinRepository: mockCabinRepository,
			permissionService: mockPermissionService,
		} = makeDependencies());
	});

	describe("#findManyBookings", () => {
		it("returns UnauthorizedError if the user is not logged in", async () => {
			const result = await cabinService.findManyBookings(makeMockContext());

			expect(result).toEqual({
				ok: false,
				error: expect.any(UnauthorizedError),
			});
		});

		it("returns PermissionDeniedError if the user does not have the required permission", async () => {
			mockPermissionService.hasFeaturePermission.mockResolvedValue(false);

			const result = await cabinService.findManyBookings(makeMockContext({}));

			expect(result).toEqual({
				ok: false,
				error: expect.any(PermissionDeniedError),
			});
			expect(mockPermissionService.hasFeaturePermission).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					featurePermission: FeaturePermission.CABIN_ADMIN,
				}),
			);
		});

		it("returns all bookings and the total count", async () => {
			const bookings = [
				mock<BookingType>(),
				mock<BookingType>(),
				mock<BookingType>(),
			];
			const totalCount = 3;

			mockCabinRepository.findManyBookings.mockResolvedValue({
				ok: true,
				data: {
					bookings,
					total: totalCount,
				},
			});
			mockPermissionService.hasFeaturePermission.mockResolvedValue(true);

			const result = await cabinService.findManyBookings(makeMockContext({}));

			expect(result).toEqual({
				ok: true,
				data: {
					bookings,
					total: totalCount,
				},
			});
		});

		it("returns InternalServerError if an unexpected error occurs", async () => {
			mockCabinRepository.findManyBookings.mockResolvedValue({
				ok: false,
				error: new InternalServerError(""),
			});
			mockPermissionService.hasFeaturePermission.mockResolvedValue(true);

			const result = await cabinService.findManyBookings(makeMockContext({}));

			expect(result).toEqual({
				ok: false,
				error: expect.any(InternalServerError),
			});
		});
	});
});

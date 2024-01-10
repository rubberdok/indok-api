import { faker } from "@faker-js/faker";
import { type Booking, type Cabin, FeaturePermission } from "@prisma/client";
import { type DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import { BookingStatus } from "~/domain/cabins.js";
import {
	InvalidArgumentError,
	PermissionDeniedError,
} from "~/domain/errors.js";
import {
	type CabinRepository,
	CabinService,
	type IMailService,
	type PermissionService,
} from "../../service.js";

describe("CabinService", () => {
	let cabinRepository: DeepMockProxy<CabinRepository>;
	let mailService: DeepMockProxy<IMailService>;
	let permissionService: DeepMockProxy<PermissionService>;
	let cabinService: CabinService;

	beforeAll(() => {
		cabinRepository = mockDeep<CabinRepository>();
		mailService = mockDeep<IMailService>();
		permissionService = mockDeep<PermissionService>();
		cabinService = new CabinService(
			cabinRepository,
			mailService,
			permissionService,
		);
	});

	describe("updateBookingStatus", () => {
		it("should throw PermissionDeniedError if user does not have permission to update booking", async () => {
			/**
			 * Arrange
			 *
			 * Mock the permissionService.hasFeaturePermission method to return false.
			 * Mock the cabinRepository.getCabinByBookingId method to return a cabin.
			 */
			const userId = faker.string.uuid();
			cabinRepository.getCabinByBookingId.mockResolvedValueOnce(mock<Cabin>());
			permissionService.hasFeaturePermission.mockResolvedValueOnce(false);

			/**
			 * Act
			 *
			 * Call updateBookingStatus
			 */
			const updateBookingStatus = cabinService.updateBookingStatus(
				userId,
				faker.string.uuid(),
				BookingStatus.CONFIRMED,
			);

			/**
			 * Assert
			 *
			 * Expect updateBookingStatus to throw a PermissionDeniedError
			 * Expect permissionService.hasFeaturePermission to be called with the correct arguments
			 */
			await expect(updateBookingStatus).rejects.toThrow(PermissionDeniedError);
			expect(permissionService.hasFeaturePermission).toHaveBeenCalledWith({
				userId: userId,
				featurePermission: FeaturePermission.CABIN_ADMIN,
			});
		});

		it("should throw InvalidArgumentError if there are overlapping bookings", async () => {
			/**
			 * Arrange
			 *
			 * Mock the permissionService.hasFeaturePermission method to return true.
			 * Mock the cabinRepository.getCabinByBookingId method to return a cabin.
			 * Mock getBookingById to return a booking.
			 * Mock getOverlappingBookings to return multiple bookings.
			 */
			const userId = faker.string.uuid();
			cabinRepository.getCabinByBookingId.mockResolvedValueOnce(mock<Cabin>());
			permissionService.hasFeaturePermission.mockResolvedValueOnce(true);
			cabinRepository.getBookingById.mockResolvedValueOnce(
				mock<Booking>({
					id: faker.string.uuid(),
					startDate: faker.date.future(),
					endDate: faker.date.future(),
				}),
			);
			cabinRepository.getOverlappingBookings.mockResolvedValueOnce([
				mock<Booking>({ id: faker.string.uuid() }),
			]);

			/**
			 * Act
			 *
			 * Call updateBookingStatus
			 */
			const updateBookingStatus = cabinService.updateBookingStatus(
				userId,
				faker.string.uuid(),
				BookingStatus.CONFIRMED,
			);

			/**
			 * Assert
			 *
			 * Expect updateBookingStatus to throw a PermissionDeniedError
			 * Expect permissionService.hasFeaturePermission to be called with the correct arguments
			 */
			await expect(updateBookingStatus).rejects.toThrow(InvalidArgumentError);
		});
	});
});

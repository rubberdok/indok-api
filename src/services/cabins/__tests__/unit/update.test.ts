import { faker } from "@faker-js/faker";
import {
	type BookingSemester,
	type Cabin,
	FeaturePermission,
} from "@prisma/client";
import { type DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import { DateTime } from "luxon";
import { pino } from "pino";
import { BookingStatus, type BookingType } from "~/domain/cabins.js";
import {
	InvalidArgumentError,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
import { makeMockContext } from "~/lib/context.js";
import { envToLogger } from "~/lib/fastify/logging.js";
import {
	CabinService,
	type ICabinRepository,
	type MailService,
	type PermissionService,
} from "../../service.js";

describe("CabinService", () => {
	let cabinRepository: DeepMockProxy<ICabinRepository>;
	let mailService: DeepMockProxy<MailService>;
	let permissionService: DeepMockProxy<PermissionService>;
	let cabinService: CabinService;

	beforeAll(() => {
		cabinRepository = mockDeep<ICabinRepository>();
		mailService = mockDeep<MailService>();
		permissionService = mockDeep<PermissionService>();
		cabinService = new CabinService(
			cabinRepository,
			mailService,
			permissionService,
		);
	});

	describe("updateBookingStatus", () => {
		it("should return PermissionDeniedError if user does not have permission to update booking", async () => {
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
			const updateBookingStatus = await cabinService.updateBookingStatus(
				makeMockContext({ id: userId }),
				{
					bookingId: faker.string.uuid(),
					status: BookingStatus.CONFIRMED,
				},
			);

			/**
			 * Assert
			 *
			 * Expect updateBookingStatus to throw a PermissionDeniedError
			 * Expect permissionService.hasFeaturePermission to be called with the correct arguments
			 */
			expect(updateBookingStatus).toEqual({
				ok: false,
				error: expect.any(PermissionDeniedError),
			});
			expect(permissionService.hasFeaturePermission).toHaveBeenCalledWith(
				expect.anything(),
				{
					featurePermission: FeaturePermission.CABIN_ADMIN,
				},
			);
		});

		it("should return UnauthorizedError if the user is not logged in", async () => {
			/**
			 * Act
			 *
			 * Call updateBookingStatus
			 */
			const updateBookingStatus = await cabinService.updateBookingStatus(
				makeMockContext(null),
				{
					bookingId: faker.string.uuid(),
					status: BookingStatus.CONFIRMED,
				},
			);

			/**
			 * Assert
			 *
			 * Expect updateBookingStatus to throw a PermissionDeniedError
			 * Expect permissionService.hasFeaturePermission to be called with the correct arguments
			 */
			expect(updateBookingStatus).toEqual({
				ok: false,
				error: expect.any(UnauthorizedError),
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
			cabinRepository.getBookingById.mockResolvedValueOnce({
				ok: true,
				data: {
					booking: mock<BookingType>({
						id: faker.string.uuid(),
						startDate: DateTime.fromObject({
							day: 1,
							month: 1,
							year: 3000,
						}).toJSDate(),
						endDate: DateTime.fromObject({
							day: 7,
							month: 1,
							year: 3000,
						}).toJSDate(),
						cabins: [mock<Cabin>({ id: faker.string.uuid() })],
					}),
				},
			});
			cabinRepository.getBookingSemester.mockResolvedValue({
				...mock<BookingSemester>(),
				startAt: DateTime.fromObject({
					year: 1000,
				}).toJSDate(),
				endAt: DateTime.fromObject({
					year: 4000,
				}).toJSDate(),
				bookingsEnabled: true,
			});
			cabinRepository.findManyBookings.mockResolvedValue({
				ok: true,
				data: {
					bookings: [
						mock<BookingType>({
							id: faker.string.uuid(),
							startDate: DateTime.fromObject({
								day: 1,
								month: 1,
								year: 3000,
							}).toJSDate(),
							endDate: DateTime.fromObject({
								day: 7,
								month: 1,
								year: 3000,
							}).toJSDate(),
						}),
					],
					total: 1,
				},
			});

			/**
			 * Act
			 *
			 * Call updateBookingStatus
			 */
			const updateBookingStatus = await cabinService.updateBookingStatus(
				makeMockContext({ id: userId }),
				{
					bookingId: faker.string.uuid(),
					status: BookingStatus.CONFIRMED,
				},
			);

			/**
			 * Assert
			 *
			 * Expect updateBookingStatus to return an InvalidArgumentError
			 */
			expect(updateBookingStatus).toEqual({
				ok: false,
				error: expect.any(InvalidArgumentError),
			});
		});

		it("updates booking status and feedback", async () => {
			/**
			 * Arrange
			 *
			 * Mock the permissionService.hasFeaturePermission method to return true.
			 * Mock the cabinRepository.getCabinByBookingId method to return a cabin.
			 * Mock getBookingById to return a booking.
			 */
			const userId = faker.string.uuid();
			cabinRepository.getCabinByBookingId.mockResolvedValueOnce(mock<Cabin>());
			permissionService.hasFeaturePermission.mockResolvedValueOnce(true);
			cabinRepository.getBookingById.mockResolvedValueOnce({
				ok: true,
				data: {
					booking: {
						...mock<BookingType>(),
						id: faker.string.uuid(),
						startDate: DateTime.fromObject({
							day: 1,
							month: 1,
							year: 3000,
						})
							.startOf("day")
							.toJSDate(),
						endDate: DateTime.fromObject({
							day: 7,
							month: 1,
							year: 3000,
						})
							.endOf("day")
							.toJSDate(),
						cabins: [mock<Cabin>({ id: faker.string.uuid() })],
					},
				},
			});
			cabinRepository.getBookingSemester.mockResolvedValue({
				...mock<BookingSemester>(),
				startAt: DateTime.fromObject({
					year: 1000,
				}).toJSDate(),
				endAt: DateTime.fromObject({
					year: 4000,
				}).toJSDate(),
				bookingsEnabled: true,
			});
			cabinRepository.findManyBookings.mockResolvedValue({
				ok: true,
				data: {
					bookings: [
						{
							...mock<BookingType>(),
							id: faker.string.uuid(),
							startDate: DateTime.fromObject({
								day: 8,
								month: 1,
								year: 3000,
							})
								.startOf("day")
								.toJSDate(),
							endDate: DateTime.fromObject({
								day: 14,
								month: 1,
								year: 3000,
							})
								.endOf("day")
								.toJSDate(),
						},
					],
					total: 1,
				},
			});
			cabinRepository.updateBooking.mockResolvedValueOnce({
				ok: true,
				data: {
					booking: {
						...mock<BookingType>(),
						status: BookingStatus.CONFIRMED,
					},
				},
			});

			/**
			 * Act
			 *
			 * Call updateBookingStatus
			 */
			const updateBookingStatus = await cabinService.updateBookingStatus(
				makeMockContext(
					{ id: userId },
					pino({ ...envToLogger.test, name: "update booking and feedback" }),
				),
				{
					bookingId: faker.string.uuid(),
					status: BookingStatus.CONFIRMED,
					feedback: faker.lorem.sentence(),
				},
			);

			/**
			 * Assert
			 *
			 * Expect updateBookingStatus to return the updated booking
			 */
			expect(updateBookingStatus).toEqual({
				ok: true,
				data: {
					booking: expect.objectContaining({
						status: BookingStatus.CONFIRMED,
					}),
				},
			});
			expect(cabinRepository.updateBooking).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					status: BookingStatus.CONFIRMED,
					feedback: expect.any(String),
				}),
			);
		});
	});
});

import { faker } from "@faker-js/faker";
import { FeaturePermission, Semester } from "@prisma/client";
import { type DeepMockProxy, mockDeep } from "jest-mock-extended";
import { DateTime } from "luxon";
import { NotFoundError, PermissionDeniedError } from "~/domain/errors.js";
import {
	type CabinRepository,
	CabinService,
	type MailService,
	type PermissionService,
} from "../../service.js";
import { makeMockContext } from "~/lib/context.js";

describe("CabinService", () => {
	let cabinRepository: DeepMockProxy<CabinRepository>;
	let cabinService: CabinService;
	let permissionSerivce: DeepMockProxy<PermissionService>;

	beforeAll(() => {
		cabinRepository = mockDeep<CabinRepository>();
		permissionSerivce = mockDeep<PermissionService>();
		cabinService = new CabinService(
			cabinRepository,
			mockDeep<MailService>(),
			permissionSerivce,
		);
	});

	describe("updateBookingSemester", () => {
		it("should throw PermissionDeniedError if user does not have permission to update booking semester", async () => {
			/**
			 * Arrange
			 *
			 * Mock the permissionService.hasFeaturePermission method to return false.
			 * Mock the cabinRepository.getCabinByBookingId method to return a cabin.
			 */
			const userId = faker.string.uuid();
			permissionSerivce.hasFeaturePermission.mockResolvedValueOnce(false);

			/**
			 * Act
			 *
			 * Call updateBookingSemester
			 */
			const updateBookingSemester = cabinService.updateBookingSemester(
				makeMockContext({ id: userId }),
				{
					semester: Semester.SPRING,
					startAt: new Date(2020, 0, 1),
					endAt: new Date(2020, 0, 2),
					bookingsEnabled: true,
				},
			);

			/**
			 * Assert
			 *
			 * Expect updateBookingSemester to throw a PermissionDeniedError
			 * Expect permissionService.hasFeaturePermission to be called with the correct arguments
			 */
			await expect(updateBookingSemester).rejects.toThrow(
				PermissionDeniedError,
			);
			expect(permissionSerivce.hasFeaturePermission).toHaveBeenCalledWith(
				expect.anything(),
				{
					featurePermission: FeaturePermission.CABIN_ADMIN,
				},
			);
		});

		it("should update the booking semester with valid arguments", async () => {
			/**
			 * Arrange
			 *
			 * Mock the permissionService.hasFeaturePermission method to return true.
			 * Mock the cabinRepository.getCabinByBookingId method to return a cabin.
			 */
			const userId = faker.string.uuid();
			permissionSerivce.hasFeaturePermission.mockResolvedValueOnce(true);

			/**
			 * Act
			 *
			 * Call updateBookingSemester
			 */
			await cabinService.updateBookingSemester(
				makeMockContext({ id: userId }),
				{
					semester: Semester.SPRING,
					startAt: new Date(2020, 0, 1),
					endAt: new Date(2020, 0, 2),
					bookingsEnabled: true,
				},
			);

			/**
			 * Assert
			 *
			 * Expect cabinRepository.updateBookingSemester to be called with the correct arguments
			 */
			expect(cabinRepository.updateBookingSemester).toHaveBeenCalledWith({
				semester: Semester.SPRING,
				startAt: new Date(2020, 0, 1),
				endAt: new Date(2020, 0, 2),
				bookingsEnabled: true,
			});
		});

		it("should not pass null values to the repository", async () => {
			/**
			 * Arrange
			 *
			 * Mock the permissionService.hasFeaturePermission method to return true.
			 * Mock the cabinRepository.getCabinByBookingId method to return a cabin.
			 */
			const userId = faker.string.uuid();
			permissionSerivce.hasFeaturePermission.mockResolvedValueOnce(true);

			/**
			 * Act
			 *
			 * Call updateBookingSemester
			 */
			await cabinService.updateBookingSemester(
				makeMockContext({ id: userId }),
				{
					semester: Semester.SPRING,
					startAt: null,
					endAt: null,
					bookingsEnabled: null,
				},
			);

			/**
			 * Assert
			 *
			 * Expect cabinRepository.updateBookingSemester to be called with the correct arguments
			 */
			expect(cabinRepository.updateBookingSemester).toHaveBeenCalledWith({
				semester: Semester.SPRING,
				startAt: undefined,
				endAt: undefined,
				bookingsEnabled: undefined,
			});
		});

		describe("if the booking semester does not exist for that semester", () => {
			it("should try to create a booking semester", async () => {
				/**
				 * Arrange
				 *
				 * Mock the permissionService.hasFeaturePermission method to return true.
				 * Mock the cabinRepository.getCabinByBookingId method to return a cabin.
				 */
				const userId = faker.string.uuid();
				permissionSerivce.hasFeaturePermission.mockResolvedValueOnce(true);
				cabinRepository.updateBookingSemester.mockRejectedValue(
					new NotFoundError("No matching booking semester found"),
				);

				/**
				 * Act
				 *
				 * Call updateBookingSemester
				 */
				await cabinService.updateBookingSemester(
					makeMockContext({ id: userId }),
					{
						semester: Semester.SPRING,
						startAt: new Date(2020, 0, 1),
						endAt: new Date(2020, 0, 2),
						bookingsEnabled: true,
					},
				);

				/**
				 * Assert
				 *
				 * Expect cabinRepository.updateBookingSemester to be called with the correct arguments
				 */
				expect(cabinRepository.createBookingSemester).toHaveBeenCalledWith({
					semester: Semester.SPRING,
					startAt: new Date(2020, 0, 1),
					endAt: new Date(2020, 0, 2),
					bookingsEnabled: true,
				});
			});

			it("should default `startAt` and `endAt` to sensible values for the SPRING semester if they are not provided", async () => {
				/**
				 * Arrange
				 *
				 * Mock the permissionService.hasFeaturePermission method to return true.
				 * Mock the cabinRepository.getCabinByBookingId method to return a cabin.
				 */
				const userId = faker.string.uuid();
				permissionSerivce.hasFeaturePermission.mockResolvedValueOnce(true);
				cabinRepository.updateBookingSemester.mockRejectedValue(
					new NotFoundError("No matching booking semester found"),
				);

				/**
				 * Act
				 *
				 * Call updateBookingSemester
				 */
				await cabinService.updateBookingSemester(
					makeMockContext({ id: userId }),
					{
						semester: Semester.SPRING,
						bookingsEnabled: true,
					},
				);

				/**
				 * Assert
				 *
				 * Expect cabinRepository.updateBookingSemester to be called with the correct arguments
				 */
				expect(cabinRepository.createBookingSemester).toHaveBeenCalledWith({
					semester: Semester.SPRING,
					startAt: DateTime.fromObject({ month: 1, day: 1 }).toJSDate(),
					endAt: DateTime.fromObject({ month: 7, day: 31 }).toJSDate(),
					bookingsEnabled: true,
				});
			});

			it("should default `startAt` and `endAt` to sensible values for the FALL semester if they are not provided", async () => {
				/**
				 * Arrange
				 *
				 * Mock the permissionService.hasFeaturePermission method to return true.
				 * Mock the cabinRepository.getCabinByBookingId method to return a cabin.
				 */
				const userId = faker.string.uuid();
				permissionSerivce.hasFeaturePermission.mockResolvedValueOnce(true);
				cabinRepository.updateBookingSemester.mockRejectedValue(
					new NotFoundError("No matching booking semester found"),
				);

				/**
				 * Act
				 *
				 * Call updateBookingSemester
				 */
				await cabinService.updateBookingSemester(
					makeMockContext({ id: userId }),
					{
						semester: Semester.FALL,
						bookingsEnabled: true,
					},
				);

				/**
				 * Assert
				 *
				 * Expect cabinRepository.updateBookingSemester to be called with the correct arguments
				 */
				expect(cabinRepository.createBookingSemester).toHaveBeenCalledWith({
					semester: Semester.FALL,
					startAt: DateTime.fromObject({ month: 8, day: 1 }).toJSDate(),
					endAt: DateTime.fromObject({ month: 12, day: 31 }).toJSDate(),
					bookingsEnabled: true,
				});
			});

			it("should default bookingEnabled to false if it is not provided", async () => {
				/**
				 * Arrange
				 *
				 * Mock the permissionService.hasFeaturePermission method to return true.
				 * Mock the cabinRepository.getCabinByBookingId method to return a cabin.
				 */
				const userId = faker.string.uuid();
				permissionSerivce.hasFeaturePermission.mockResolvedValueOnce(true);
				cabinRepository.updateBookingSemester.mockRejectedValue(
					new NotFoundError("No matching booking semester found"),
				);

				/**
				 * Act
				 *
				 * Call updateBookingSemester
				 */
				await cabinService.updateBookingSemester(
					makeMockContext({ id: userId }),
					{
						semester: Semester.SPRING,
						startAt: new Date(2020, 0, 1),
						endAt: new Date(2020, 0, 2),
					},
				);

				/**
				 * Assert
				 *
				 * Expect cabinRepository.updateBookingSemester to be called with the correct arguments
				 */
				expect(cabinRepository.createBookingSemester).toHaveBeenCalledWith({
					semester: Semester.SPRING,
					startAt: new Date(2020, 0, 1),
					endAt: new Date(2020, 0, 2),
					bookingsEnabled: false,
				});
			});
		});
	});
});

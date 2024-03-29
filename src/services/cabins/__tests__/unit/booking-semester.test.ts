import { faker } from "@faker-js/faker";
import type { DeepMockProxy } from "jest-mock-extended";
import { DateTime } from "luxon";
import { BookingSemesterEnum } from "~/domain/cabins.js";
import { NotFoundError, PermissionDeniedError } from "~/domain/errors.js";
import { FeaturePermission } from "~/domain/organizations.js";
import { makeMockContext } from "~/lib/context.js";
import type {
	CabinService,
	ICabinRepository,
	PermissionService,
} from "../../service.js";
import { makeDependencies } from "./dependencies.js";

describe("CabinService", () => {
	let cabinRepository: DeepMockProxy<ICabinRepository>;
	let cabinService: CabinService;
	let permissionService: DeepMockProxy<PermissionService>;

	beforeAll(() => {
		({ cabinRepository, cabinService, permissionService } = makeDependencies());
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
			permissionService.hasFeaturePermission.mockResolvedValueOnce(false);

			/**
			 * Act
			 *
			 * Call updateBookingSemester
			 */
			const updateBookingSemester = cabinService.updateBookingSemester(
				makeMockContext({ id: userId }),
				{
					semester: BookingSemesterEnum.SPRING,
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
			expect(permissionService.hasFeaturePermission).toHaveBeenCalledWith(
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
			permissionService.hasFeaturePermission.mockResolvedValueOnce(true);

			/**
			 * Act
			 *
			 * Call updateBookingSemester
			 */
			await cabinService.updateBookingSemester(
				makeMockContext({ id: userId }),
				{
					semester: BookingSemesterEnum.SPRING,
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
				semester: BookingSemesterEnum.SPRING,
				startAt: new Date(2020, 0, 1),
				endAt: DateTime.fromObject({ year: 2020, month: 1, day: 2 })
					.endOf("day")
					.toJSDate(),
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
			permissionService.hasFeaturePermission.mockResolvedValueOnce(true);

			/**
			 * Act
			 *
			 * Call updateBookingSemester
			 */
			await cabinService.updateBookingSemester(
				makeMockContext({ id: userId }),
				{
					semester: BookingSemesterEnum.SPRING,
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
				semester: BookingSemesterEnum.SPRING,
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
				permissionService.hasFeaturePermission.mockResolvedValueOnce(true);
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
						semester: BookingSemesterEnum.SPRING,
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
					semester: BookingSemesterEnum.SPRING,
					startAt: new Date(2020, 0, 1),
					endAt: DateTime.fromObject({
						year: 2020,
						month: 1,
						day: 2,
					})
						.endOf("day")
						.toJSDate(),
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
				permissionService.hasFeaturePermission.mockResolvedValueOnce(true);
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
						semester: BookingSemesterEnum.SPRING,
						bookingsEnabled: true,
					},
				);

				/**
				 * Assert
				 *
				 * Expect cabinRepository.updateBookingSemester to be called with the correct arguments
				 */
				expect(cabinRepository.createBookingSemester).toHaveBeenCalledWith({
					semester: BookingSemesterEnum.SPRING,
					startAt: DateTime.fromObject({ month: 1, day: 1 }).toJSDate(),
					endAt: DateTime.fromObject({ month: 7, day: 31 })
						.endOf("day")
						.toJSDate(),
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
				permissionService.hasFeaturePermission.mockResolvedValueOnce(true);
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
						semester: BookingSemesterEnum.FALL,
						bookingsEnabled: true,
					},
				);

				/**
				 * Assert
				 *
				 * Expect cabinRepository.updateBookingSemester to be called with the correct arguments
				 */
				expect(cabinRepository.createBookingSemester).toHaveBeenCalledWith({
					semester: BookingSemesterEnum.FALL,
					startAt: DateTime.fromObject({ month: 8, day: 1 }).toJSDate(),
					endAt: DateTime.fromObject({ month: 12, day: 31 })
						.endOf("day")
						.toJSDate(),
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
				permissionService.hasFeaturePermission.mockResolvedValueOnce(true);
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
						semester: BookingSemesterEnum.SPRING,
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
					semester: BookingSemesterEnum.SPRING,
					startAt: new Date(2020, 0, 1),
					endAt: DateTime.fromObject({
						year: 2020,
						month: 1,
						day: 2,
					})
						.endOf("day")
						.toJSDate(),
					bookingsEnabled: false,
				});
			});
		});
	});
});

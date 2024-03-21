import { faker } from "@faker-js/faker";
import type { DeepMockProxy } from "jest-mock-extended";
import { merge } from "lodash-es";
import { DateTime, Settings } from "luxon";
import type { BookingSemester, BookingType, Cabin } from "~/domain/cabins.js";
import { makeMockContext } from "~/lib/context.js";
import type { CabinService, ICabinRepository } from "../../service.js";
import { makeDependencies } from "./dependencies.js";

describe("Cabin Service", () => {
	let cabinService: CabinService;
	let mockCabinRepository: DeepMockProxy<ICabinRepository>;

	beforeAll(() => {
		({ cabinService, cabinRepository: mockCabinRepository } =
			makeDependencies());
		// Today is the first of january, for ever.
		const januaryFirst2024 = DateTime.fromObject({
			year: 2024,
			month: 1,
			day: 1,
		})
			.startOf("day")
			.toMillis();
		Settings.now = () => januaryFirst2024;
	});

	describe("#getAvailabilityCalendar", () => {
		it("returns a list of months equal to count, starting with the provided month", async () => {
			mockCabinRepository.getCabinById.mockResolvedValue(makeCabin());
			mockCabinRepository.getBookingSemester.mockResolvedValue(null);
			mockCabinRepository.findManyBookings.mockResolvedValue({
				ok: true,
				data: {
					bookings: [],
					total: 0,
				},
			});

			const result = await cabinService.getAvailabilityCalendar(
				makeMockContext(),
				{
					cabins: [{ id: faker.string.uuid() }],
					count: 12,
					guests: {
						external: 10,
						internal: 10,
					},
					month: 1,
					year: 2024,
				},
			);

			if (!result.ok) throw result.error;
			const { calendarMonths } = result.data;
			expect(calendarMonths).toHaveLength(12);
			expect(calendarMonths[0]?.month).toBe(1);
			expect(calendarMonths[0]?.year).toBe(2024);
			expect(calendarMonths[11]?.month).toBe(12);
			expect(calendarMonths[11]?.year).toBe(2024);
		});

		it("returns bookable: false for all past dates", async () => {
			mockCabinRepository.getCabinById.mockResolvedValue(makeCabin());
			mockCabinRepository.getBookingSemester.mockResolvedValue(
				makeBookingSemester({
					startAt: DateTime.fromObject({
						year: 2023,
						month: 1,
						day: 1,
					}).toJSDate(),
					endAt: DateTime.fromObject({
						year: 2024,
						month: 12,
						day: 31,
					}).toJSDate(),
				}),
			);
			mockCabinRepository.findManyBookings.mockResolvedValue({
				ok: true,
				data: {
					bookings: [],
					total: 0,
				},
			});

			const result = await cabinService.getAvailabilityCalendar(
				makeMockContext(),
				{
					cabins: [{ id: faker.string.uuid() }],
					count: 2,
					guests: {
						external: 10,
						internal: 10,
					},
					month: 12,
					year: 2023,
				},
			);

			if (!result.ok) throw result.error;
			const { calendarMonths } = result.data;
			expect(calendarMonths[0]?.days[0]?.bookable).toBe(false);
			expect(calendarMonths[1]?.days[1]?.bookable).toBe(true);
		});

		it("returns bookable: false for today", async () => {
			mockCabinRepository.getCabinById.mockResolvedValue(makeCabin());
			mockCabinRepository.getBookingSemester.mockResolvedValue(
				makeBookingSemester({
					startAt: DateTime.fromObject({
						year: 2023,
						month: 1,
						day: 1,
					}).toJSDate(),
					endAt: DateTime.fromObject({
						year: 2024,
						month: 12,
						day: 31,
					}).toJSDate(),
				}),
			);
			mockCabinRepository.findManyBookings.mockResolvedValue({
				ok: true,
				data: {
					bookings: [],
					total: 0,
				},
			});

			const result = await cabinService.getAvailabilityCalendar(
				makeMockContext(),
				{
					cabins: [{ id: faker.string.uuid() }],
					count: 2,
					guests: {
						external: 10,
						internal: 10,
					},
					month: 1,
					year: 2024,
				},
			);

			if (!result.ok) throw result.error;
			const { calendarMonths } = result.data;
			expect(calendarMonths[0]?.days[0]?.bookable).toBe(false);
		});

		it("returns all days of all the months", async () => {
			mockCabinRepository.getCabinById.mockResolvedValue(makeCabin());
			mockCabinRepository.getBookingSemester.mockResolvedValue(null);
			mockCabinRepository.findManyBookings.mockResolvedValue({
				ok: true,
				data: {
					bookings: [],
					total: 0,
				},
			});
			const expectedDaysByMonth: Record<number, number> = {
				1: 31,
				// 2024 is a leap year
				2: 29,
				3: 31,
				4: 30,
				5: 31,
				6: 30,
				7: 31,
				8: 31,
				9: 30,
				10: 31,
				11: 30,
				12: 31,
			};

			const result = await cabinService.getAvailabilityCalendar(
				makeMockContext(),
				{
					cabins: [{ id: faker.string.uuid() }],
					count: 12,
					guests: {
						external: 10,
						internal: 10,
					},
					month: 1,
					year: 2024,
				},
			);

			if (!result.ok) throw result.error;
			const { calendarMonths } = result.data;
			expect(calendarMonths).toHaveLength(12);

			for (let i = 0; i < 12; i++) {
				const expectedDays = expectedDaysByMonth[i + 1];
				if (!expectedDays) throw new Error(`No expected days for month ${i}`);
				expect(calendarMonths[i]?.days).toHaveLength(expectedDays);
				for (let j = 0; j < expectedDays; j++) {
					const expectedCalendarDate = DateTime.fromObject({
						month: i + 1,
						year: 2024,
						day: j + 1,
					});
					expect(
						calendarMonths[i]?.days[j]?.calendarDate.equals(
							expectedCalendarDate,
						),
					).toBe(true);
					expect(calendarMonths[i]?.month).toBe(i + 1);
					expect(calendarMonths[i]?.year).toBe(2024);
				}
			}
		});

		it("returns bookable: true for days engulfed by a booking semester", async () => {
			mockCabinRepository.getCabinById.mockResolvedValue(makeCabin());
			mockCabinRepository.getBookingSemester.mockResolvedValue(
				makeBookingSemester({
					bookingsEnabled: true,
					startAt: DateTime.fromObject({
						year: 2024,
						day: 1,
						month: 2,
					})
						.startOf("day")
						.toJSDate(),
					endAt: DateTime.fromObject({
						year: 2024,
						month: 2,
						day: 4,
					}).toJSDate(),
				}),
			);
			mockCabinRepository.findManyBookings.mockResolvedValue({
				ok: true,
				data: {
					bookings: [],
					total: 0,
				},
			});

			const result = await cabinService.getAvailabilityCalendar(
				makeMockContext(),
				{
					cabins: [{ id: faker.string.uuid() }],
					count: 12,
					guests: {
						external: 10,
						internal: 10,
					},
					month: 2,
					year: 2024,
				},
			);
			if (!result.ok) throw result.error;

			const { calendarMonths } = result.data;
			// the four first days in the first month should be bookable, the rest not.
			const firstFourDays = calendarMonths[0]?.days.slice(0, 4);
			if (!firstFourDays) throw new Error("No days in first month");
			for (const day of firstFourDays) {
				expect(day.bookable).toBe(true);
			}
			const remainingDays = calendarMonths[0]?.days.slice(4);
			if (!remainingDays) throw new Error("No remaining days in first month");
			for (const day of remainingDays) {
				expect(day.bookable).toBe(false);
			}

			// the rest of the months should not be bookable
			for (const month of calendarMonths.slice(1)) {
				for (const day of month.days) {
					expect(day.bookable).toBe(false);
				}
			}
		});

		it("returns available: true for days that don't overlap with an existing booking", async () => {
			mockCabinRepository.getCabinById.mockResolvedValue(makeCabin());
			mockCabinRepository.getBookingSemester.mockResolvedValue(null);
			mockCabinRepository.findManyBookings.mockResolvedValue({
				ok: true,
				data: {
					bookings: [
						makeBooking({
							startDate: DateTime.fromObject({
								year: 2024,
								month: 1,
								day: 1,
							}).toJSDate(),
							endDate: DateTime.fromObject({
								year: 2024,
								month: 1,
								day: 4,
							}).toJSDate(),
							status: "CONFIRMED",
						}),
					],
					total: 1,
				},
			});

			const result = await cabinService.getAvailabilityCalendar(
				makeMockContext(),
				{
					cabins: [{ id: faker.string.uuid() }],
					count: 12,
					guests: {
						external: 10,
						internal: 10,
					},
					month: 1,
					year: 2024,
				},
			);
			if (!result.ok) throw result.error;

			const { calendarMonths } = result.data;
			// the four first days in the first month should not be available the rest should
			const firstFourDays = calendarMonths[0]?.days.slice(0, 4);
			if (!firstFourDays) throw new Error("No days in first month");
			for (const day of firstFourDays) {
				expect(day.available).toBe(false);
			}
			const remainingDays = calendarMonths[0]?.days.slice(4);
			if (!remainingDays) throw new Error("No remaining days in first month");
			for (const day of remainingDays) {
				expect(day.available).toBe(true);
			}

			// the rest of the months should be available
			for (const month of calendarMonths.slice(1)) {
				for (const day of month.days) {
					expect(day.available).toBe(true);
				}
			}
		});

		it("returns availableForCheckIn: true on days where the current and next day are both bookable and available", async () => {
			mockCabinRepository.getCabinById.mockResolvedValue(makeCabin());
			mockCabinRepository.getBookingSemester.mockResolvedValueOnce(
				makeBookingSemester({
					bookingsEnabled: true,
					startAt: DateTime.fromObject({
						year: 2024,
						month: 2,
						day: 1,
					}).toJSDate(),
					endAt: DateTime.fromObject({
						year: 2024,
						month: 2,
						day: 4,
					}).toJSDate(),
				}),
			);
			mockCabinRepository.getBookingSemester.mockResolvedValueOnce(
				makeBookingSemester({
					bookingsEnabled: true,
					startAt: DateTime.fromObject({
						year: 2024,
						month: 2,
						day: 7,
					}).toJSDate(),
					endAt: DateTime.fromObject({
						year: 2024,
						month: 2,
						day: 8,
					}).toJSDate(),
				}),
			);
			mockCabinRepository.findManyBookings.mockResolvedValue({
				ok: true,
				data: {
					bookings: [
						makeBooking({
							startDate: DateTime.fromObject({
								year: 2024,
								month: 2,
								day: 3,
							}).toJSDate(),
							endDate: DateTime.fromObject({
								year: 2024,
								month: 2,
								day: 4,
							}).toJSDate(),
							status: "CONFIRMED",
						}),
					],
					total: 1,
				},
			});

			const result = await cabinService.getAvailabilityCalendar(
				makeMockContext({}),
				{
					cabins: [{ id: faker.string.uuid() }],
					count: 12,
					guests: {
						external: 10,
						internal: 10,
					},
					month: 2,
					year: 2024,
				},
			);
			if (!result.ok) throw result.error;

			const { calendarMonths } = result.data;
			// the first day should be checkInAvailable
			expect(calendarMonths[0]?.days[0]?.availableForCheckIn).toBe(true);
			// the second day should not, as there is a booking starting on the third day
			expect(calendarMonths[0]?.days[1]?.availableForCheckIn).toBe(false);
			// the third day should not, as there is a booking starting on the third and fourth day
			expect(calendarMonths[0]?.days[2]?.availableForCheckIn).toBe(false);
			// the fourth day shouldnot, as there is a booking starting on the third and fourth day
			expect(calendarMonths[0]?.days[3]?.availableForCheckIn).toBe(false);
			// the fifth day should not, as there is no booking semester
			expect(calendarMonths[0]?.days[4]?.availableForCheckIn).toBe(false);
			// the seventh day should, as there is a booking semester and no booking
			expect(calendarMonths[0]?.days[6]?.availableForCheckIn).toBe(true);
			// the eight day should not, as the booking semester ends that day
			expect(calendarMonths[0]?.days[7]?.availableForCheckIn).toBe(false);
		});

		it("returns availableForCheckIn: true for tomorrow if tomorrow is contained in a booking semester", async () => {
			mockCabinRepository.getCabinById.mockResolvedValue(makeCabin());
			mockCabinRepository.getBookingSemester.mockResolvedValueOnce(
				makeBookingSemester({
					bookingsEnabled: true,
					startAt: DateTime.fromObject({
						year: 2024,
						month: 1,
						day: 1,
					}).toJSDate(),
					endAt: DateTime.fromObject({
						year: 2024,
						month: 1,
						day: 31,
					}).toJSDate(),
				}),
			);

			const result = await cabinService.getAvailabilityCalendar(
				makeMockContext({}),
				{
					cabins: [{ id: faker.string.uuid() }],
					count: 12,
					guests: {
						external: 10,
						internal: 10,
					},
					month: 1,
					year: 2024,
				},
			);
			if (!result.ok) throw result.error;

			const { calendarMonths } = result.data;
			// today should not be available for check in as bookings must be in the future
			expect(calendarMonths[0]?.days[0]?.availableForCheckIn).toBe(false);
			// tomorrow should be available for check in, as yesterday was not, and it is contained in a booking semester
			expect(calendarMonths[0]?.days[1]?.availableForCheckIn).toBe(true);
			// the day after tomorrow should not be availableForCheckIn, the day before it was.
			expect(calendarMonths[0]?.days[2]?.availableForCheckIn).toBe(false);
		});

		it("returns availableForCheckOut: true on days where the the current and previous day are both bookable and available", async () => {
			mockCabinRepository.getCabinById.mockResolvedValue(makeCabin());
			mockCabinRepository.getBookingSemester.mockResolvedValueOnce(
				makeBookingSemester({
					bookingsEnabled: true,
					startAt: DateTime.fromObject({
						year: 2024,
						month: 2,
						day: 1,
					}).toJSDate(),
					endAt: DateTime.fromObject({
						year: 2024,
						month: 2,
						day: 5,
					}).toJSDate(),
				}),
			);
			mockCabinRepository.getBookingSemester.mockResolvedValueOnce(
				makeBookingSemester({
					bookingsEnabled: true,
					startAt: DateTime.fromObject({
						year: 2024,
						month: 2,
						day: 7,
					}).toJSDate(),
					endAt: DateTime.fromObject({
						year: 2024,
						month: 2,
						day: 8,
					}).toJSDate(),
				}),
			);
			mockCabinRepository.findManyBookings.mockResolvedValue({
				ok: true,
				data: {
					bookings: [
						makeBooking({
							startDate: DateTime.fromObject({
								year: 2024,
								month: 2,
								day: 3,
							}).toJSDate(),
							endDate: DateTime.fromObject({
								year: 2024,
								month: 2,
								day: 4,
							}).toJSDate(),
							status: "CONFIRMED",
						}),
					],
					total: 1,
				},
			});

			const result = await cabinService.getAvailabilityCalendar(
				makeMockContext({}),
				{
					cabins: [{ id: faker.string.uuid() }],
					count: 12,
					guests: {
						external: 10,
						internal: 10,
					},
					month: 2,
					year: 2024,
				},
			);
			if (!result.ok) throw result.error;

			const { calendarMonths } = result.data;
			// the first day should not be, as the booking semester starts that day
			expect(calendarMonths[0]?.days[0]?.availableForCheckOut).toBe(false);
			expect(calendarMonths[0]?.days[0]?.bookable).toBe(true);
			// the second day should, as there is a booking semester and no booking
			expect(calendarMonths[0]?.days[1]?.availableForCheckOut).toBe(true);
			// the third day should not, as there is a booking starting on the third and fourth day
			expect(calendarMonths[0]?.days[2]?.availableForCheckOut).toBe(false);
			// the fourth day shouldnot, as there is a booking starting on the third and fourth day
			expect(calendarMonths[0]?.days[3]?.availableForCheckOut).toBe(false);
			// the fifth day should not, as a booking ended on the previous day
			expect(calendarMonths[0]?.days[4]?.availableForCheckOut).toBe(false);
			// the seventh day should not, as there is a booking starting on the seventh
			expect(calendarMonths[0]?.days[6]?.availableForCheckOut).toBe(false);
			// the eight should, as there is a booking semester and no booking
			expect(calendarMonths[0]?.days[7]?.availableForCheckOut).toBe(true);
		});

		it("returns available: false for days that are squeezed between bookings, and there is no minimum interval available", async () => {
			mockCabinRepository.getCabinById.mockResolvedValue(makeCabin());
			mockCabinRepository.getBookingSemester.mockResolvedValueOnce(
				makeBookingSemester({
					bookingsEnabled: true,
					startAt: DateTime.fromObject({
						year: 2024,
						month: 1,
						day: 1,
					}).toJSDate(),
					endAt: DateTime.fromObject({
						year: 2024,
						month: 1,
						day: 31,
					}).toJSDate(),
				}),
			);
			mockCabinRepository.findManyBookings.mockResolvedValue({
				ok: true,
				data: {
					bookings: [
						makeBooking({
							startDate: DateTime.fromObject({
								year: 2024,
								month: 1,
								day: 1,
							}).toJSDate(),
							endDate: DateTime.fromObject({
								year: 2024,
								month: 1,
								day: 2,
							}).toJSDate(),
							status: "CONFIRMED",
						}),
						makeBooking({
							startDate: DateTime.fromObject({
								year: 2024,
								month: 1,
								day: 4,
							}).toJSDate(),
							endDate: DateTime.fromObject({
								year: 2024,
								month: 1,
								day: 5,
							}).toJSDate(),
							status: "CONFIRMED",
						}),
					],
					total: 2,
				},
			});

			const result = await cabinService.getAvailabilityCalendar(
				makeMockContext(),
				{
					cabins: [{ id: faker.string.uuid() }],
					count: 12,
					guests: {
						external: 10,
						internal: 10,
					},
					month: 1,
					year: 2024,
				},
			);
			if (!result.ok) throw result.error;

			const { calendarMonths } = result.data;
			// the third day is squeezed between two unbookable days, and should not be bookable
			expect(calendarMonths[0]?.days[2]?.bookable).toBe(false);
		});

		it("returns available: false for days that are squeezed between bookings and a bookable date, and there is no minimum interval available", async () => {
			mockCabinRepository.getCabinById.mockResolvedValue(makeCabin());
			mockCabinRepository.getBookingSemester.mockResolvedValueOnce(
				makeBookingSemester({
					bookingsEnabled: true,
					startAt: DateTime.fromObject({
						year: 2024,
						month: 1,
						day: 1,
					}).toJSDate(),
					endAt: DateTime.fromObject({
						year: 2024,
						month: 1,
						day: 31,
					}).toJSDate(),
				}),
			);
			mockCabinRepository.findManyBookings.mockResolvedValue({
				ok: true,
				data: {
					bookings: [
						makeBooking({
							startDate: DateTime.fromObject({
								year: 2024,
								month: 1,
								day: 1,
							}).toJSDate(),
							endDate: DateTime.fromObject({
								year: 2024,
								month: 1,
								day: 30,
							}).toJSDate(),
							status: "CONFIRMED",
						}),
					],
					total: 1,
				},
			});

			const result = await cabinService.getAvailabilityCalendar(
				makeMockContext(),
				{
					cabins: [{ id: faker.string.uuid() }],
					count: 12,
					guests: {
						external: 10,
						internal: 10,
					},
					month: 1,
					year: 2024,
				},
			);
			if (!result.ok) throw result.error;

			const { calendarMonths } = result.data;
			// the third day is squeezed between two unbookable days, and should not be available
			expect(calendarMonths[0]?.days[30]?.bookable).toBe(false);
		});

		it("returns available: false for days that are squeezed between bookings and the past, and there is no minimum interval available", async () => {
			mockCabinRepository.getCabinById.mockResolvedValue(makeCabin());
			mockCabinRepository.getBookingSemester.mockResolvedValueOnce(
				makeBookingSemester({
					bookingsEnabled: true,
					startAt: DateTime.fromObject({
						year: 2023,
						month: 1,
						day: 1,
					}).toJSDate(),
					endAt: DateTime.fromObject({
						year: 2024,
						month: 1,
						day: 31,
					}).toJSDate(),
				}),
			);
			mockCabinRepository.findManyBookings.mockResolvedValue({
				ok: true,
				data: {
					bookings: [
						makeBooking({
							startDate: DateTime.fromObject({
								year: 2024,
								month: 1,
								day: 2,
							}).toJSDate(),
							endDate: DateTime.fromObject({
								year: 2024,
								month: 1,
								day: 30,
							}).toJSDate(),
							status: "CONFIRMED",
						}),
					],
					total: 1,
				},
			});

			const result = await cabinService.getAvailabilityCalendar(
				makeMockContext(),
				{
					cabins: [{ id: faker.string.uuid() }],
					count: 12,
					guests: {
						external: 10,
						internal: 10,
					},
					month: 1,
					year: 2024,
				},
			);
			if (!result.ok) throw result.error;

			const { calendarMonths } = result.data;
			// the third day is squeezed between two unbookable days, and should not be available
			expect(calendarMonths[0]?.days[0]?.bookable).toBe(false);
		});

		it("returns availableForCheckOut: true for the last day of a booking semester if the next booking semester is adjacent, and not overlapping", async () => {
			mockCabinRepository.getCabinById.mockResolvedValue(makeCabin());
			mockCabinRepository.getBookingSemester.mockResolvedValueOnce(
				makeBookingSemester({
					bookingsEnabled: true,
					startAt: DateTime.fromObject({
						year: 2024,
						month: 1,
						day: 1,
					}).toJSDate(),
					endAt: DateTime.fromObject({
						year: 2024,
						month: 1,
						day: 15,
					})
						.endOf("day")
						.toJSDate(),
				}),
			);
			mockCabinRepository.getBookingSemester.mockResolvedValueOnce(
				makeBookingSemester({
					bookingsEnabled: true,
					startAt: DateTime.fromObject({
						year: 2024,
						month: 1,
						day: 16,
					}).toJSDate(),
					endAt: DateTime.fromObject({
						year: 2024,
						month: 1,
						day: 31,
					})
						.endOf("day")
						.toJSDate(),
				}),
			);
			mockCabinRepository.findManyBookings.mockResolvedValue({
				ok: true,
				data: {
					bookings: [],
					total: 0,
				},
			});

			const result = await cabinService.getAvailabilityCalendar(
				makeMockContext(),
				{
					cabins: [{ id: faker.string.uuid() }],
					count: 12,
					guests: {
						external: 10,
						internal: 10,
					},
					month: 1,
					year: 2024,
				},
			);
			if (!result.ok) throw result.error;

			const { calendarMonths } = result.data;
			// the third day is squeezed between two unbookable days, and should not be available
			expect(calendarMonths[0]?.days[14]?.availableForCheckOut).toBe(true);
		});

		describe("price", () => {
			interface TestCase {
				name: string;
				price: Partial<{
					internalPriceWeekend: number;
					externalPrice: number;
					internalPrice: number;
					externalPriceWeekend: number;
				}>;
				guests: {
					internal: number;
					external: number;
				};
				expectedPrice: number;
				day: number;
			}

			const testCases: TestCase[] = [
				{
					name: "returns with price: internalPrice if internal >= external guests, and the date is a weekday",
					price: { internalPrice: 100_000, externalPrice: 0 },
					guests: {
						internal: 10,
						external: 10,
					},
					expectedPrice: 100_000,

					// January 1st 2024 was a monday
					day: 0,
				},
				{
					name: "returns with price: externalPrice if internal < external guests, and the date is a weekday",
					price: { internalPrice: 0, externalPrice: 200_000 },
					guests: {
						internal: 10,
						external: 11,
					},
					expectedPrice: 200_000,
					// January 1st 2024 was a monday
					day: 0,
				},
				{
					name: "returns with price: internalPriceWeekend if internal >= external guests, and the date is a weekend",
					price: { externalPriceWeekend: 0, internalPriceWeekend: 300_000 },
					guests: {
						internal: 10,
						external: 10,
					},
					expectedPrice: 300_000,
					// January 6th 2024 was a saturday
					day: 5,
				},
				{
					name: "returns with price: externalPriceWeekend if internal < external guests, and the date is a weekend",
					price: { externalPriceWeekend: 400_000, internalPriceWeekend: 0 },
					guests: {
						internal: 10,
						external: 11,
					},
					expectedPrice: 400_000,
					// January 6th 2024 was a saturday
					day: 5,
				},
			];

			test.each(testCases)(
				"$name",
				async ({ price, expectedPrice, guests, day }) => {
					mockCabinRepository.getCabinById.mockResolvedValue(
						makeCabin({ ...price }),
					);
					mockCabinRepository.getBookingSemester.mockResolvedValueOnce(null);
					mockCabinRepository.findManyBookings.mockResolvedValue({
						ok: true,
						data: {
							bookings: [],
							total: 0,
						},
					});

					const result = await cabinService.getAvailabilityCalendar(
						makeMockContext(),
						{
							cabins: [{ id: faker.string.uuid() }],
							count: 12,
							guests: guests,
							month: 1,
							year: 2024,
						},
					);
					if (!result.ok) throw result.error;

					const { calendarMonths } = result.data;
					const actualDay = calendarMonths[0]?.days[day];
					expect(actualDay?.price).toBe(expectedPrice);
				},
			);
		});
	});
});

function makeCabin(data?: Partial<Cabin>): Cabin {
	const price = 100;
	return merge(
		{
			id: faker.string.uuid(),
			createdAt: faker.date.recent(),
			externalPrice: price,
			internalPrice: price,
			capacity: 10,
			externalPriceWeekend: price,
			internalPriceWeekend: price,
			name: faker.word.adjective(),
			updatedAt: faker.date.recent(),
		},
		data,
	);
}

function makeBookingSemester(data?: Partial<BookingSemester>): BookingSemester {
	const { startAt, endAt, ...rest } = data ?? {};
	const endAtDateTime = endAt
		? DateTime.fromJSDate(endAt).endOf("day").toJSDate()
		: DateTime.fromObject({ year: 3000 }).endOf("day").toJSDate();
	const startAtDateTime = startAt
		? DateTime.fromJSDate(startAt).startOf("day").toJSDate()
		: DateTime.fromObject({ year: 3000 }).startOf("day").toJSDate();
	return merge<BookingSemester, Partial<BookingSemester> | undefined>(
		{
			id: faker.string.uuid(),
			bookingsEnabled: true,
			endAt: endAtDateTime,
			startAt: startAtDateTime,
			semester: "FALL",
			updatedAt: faker.date.recent(),
		},
		rest,
	);
}

function makeBooking(data?: Partial<BookingType>): BookingType {
	const { startDate, endDate, ...rest } = data ?? {};
	const endAtDateTime = endDate
		? DateTime.fromJSDate(endDate).endOf("day").toJSDate()
		: DateTime.fromObject({ year: 2500, month: 2, day: 1 }).toJSDate();
	const startAtDateTime = startDate
		? DateTime.fromJSDate(startDate).startOf("day").toJSDate()
		: DateTime.fromObject({ year: 2500, month: 1, day: 1 }).toJSDate();

	return merge<BookingType, Partial<BookingType> | undefined>(
		{
			id: faker.string.uuid(),
			createdAt: faker.date.recent(),
			email: faker.internet.email(),
			firstName: faker.person.firstName(),
			lastName: faker.person.lastName(),
			phoneNumber: faker.phone.number(),
			endDate: endAtDateTime,
			startDate: startAtDateTime,
			status: "CONFIRMED",
			totalCost: 100,
			internalParticipantsCount: 10,
			externalParticipantsCount: 10,
			questions: faker.lorem.sentence(),
			feedback: faker.lorem.sentence(),
			cabins: [{ id: faker.string.uuid() }],
		},
		rest,
	);
}

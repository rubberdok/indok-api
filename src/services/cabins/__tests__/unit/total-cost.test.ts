import { faker } from "@faker-js/faker";
import type { Cabin } from "@prisma/client";
import { mock } from "jest-mock-extended";
import { DateTime } from "luxon";
import {
	type InternalServerError,
	InvalidArgumentError,
	type NotFoundError,
} from "~/domain/errors.js";
import type { Result } from "~/lib/result.js";
import { CabinService, type ICabinRepository } from "../../service.js";

describe("CabinService", () => {
	describe("#totalCost", () => {
		interface TestCase {
			name: string;
			arrange: {
				cabins: {
					internalPrice: number;
					externalPrice: number;
					internalPriceWeekend: number;
					externalPriceWeekend: number;
				}[];
			};
			act: {
				startDate: Date;
				endDate: Date;
				participants: {
					internal: number;
					external: number;
				};
			};
			expected: Result<
				{ totalCost: number },
				InvalidArgumentError | NotFoundError | InternalServerError
			>;
		}

		const testCases: TestCase[] = [
			{
				name: "should use the internal price for all cabins if the booking has more than or equal to 50% internal participants",
				arrange: {
					cabins: [
						{
							internalPrice: 100,
							externalPrice: 200,
							internalPriceWeekend: 150,
							externalPriceWeekend: 250,
						},
					],
				},
				act: {
					startDate: DateTime.fromObject({ weekday: 1 }).toJSDate(),
					endDate: DateTime.fromObject({ weekday: 2 }).toJSDate(),
					participants: {
						internal: 5,
						external: 5,
					},
				},
				expected: {
					ok: true,
					data: {
						totalCost: 100,
					},
				},
			},
			{
				name: "should use the external price for all cabins if the booking has less than 50% internal participants",
				arrange: {
					cabins: [
						{
							internalPrice: 100,
							externalPrice: 200,
							internalPriceWeekend: 150,
							externalPriceWeekend: 250,
						},
					],
				},
				act: {
					startDate: DateTime.fromObject({ weekday: 1 }).toJSDate(),
					endDate: DateTime.fromObject({ weekday: 2 }).toJSDate(),
					participants: {
						internal: 5,
						external: 6,
					},
				},
				expected: {
					ok: true,
					data: {
						totalCost: 200,
					},
				},
			},
			{
				name: "should weekend price for bookings Saturday -> Sunday",
				arrange: {
					cabins: [
						{
							internalPrice: 100,
							externalPrice: 200,
							internalPriceWeekend: 150,
							externalPriceWeekend: 250,
						},
					],
				},
				act: {
					startDate: DateTime.fromObject({ weekday: 6 }).toJSDate(),
					endDate: DateTime.fromObject({ weekday: 7 }).toJSDate(),
					participants: {
						internal: 5,
						external: 5,
					},
				},
				expected: {
					ok: true,
					data: {
						totalCost: 150,
					},
				},
			},
			{
				name: "should weekend price for bookings Friday -> Saturday",
				arrange: {
					cabins: [
						{
							internalPrice: 100,
							externalPrice: 200,
							internalPriceWeekend: 150,
							externalPriceWeekend: 250,
						},
					],
				},
				act: {
					startDate: DateTime.fromObject({ weekday: 5 }).toJSDate(),
					endDate: DateTime.fromObject({ weekday: 6 }).toJSDate(),
					participants: {
						internal: 5,
						external: 5,
					},
				},
				expected: {
					ok: true,
					data: {
						totalCost: 150,
					},
				},
			},
			{
				name: "should weekday and weekend  price for bookings Monday -> Monday",
				arrange: {
					cabins: [
						{
							internalPrice: 100,
							externalPrice: 200,
							internalPriceWeekend: 150,
							externalPriceWeekend: 250,
						},
					],
				},
				act: {
					startDate: DateTime.fromObject({ weekday: 1 }).toJSDate(),
					endDate: DateTime.fromObject({ weekday: 1 })
						.plus({ weeks: 1 })
						.toJSDate(),
					participants: {
						internal: 5,
						external: 5,
					},
				},
				expected: {
					ok: true,
					data: {
						totalCost: 2 * 150 + 5 * 100,
					},
				},
			},
			{
				name: "should add the cost of multiple cabins together",
				arrange: {
					cabins: [
						{
							internalPrice: 100,
							externalPrice: 200,
							internalPriceWeekend: 150,
							externalPriceWeekend: 250,
						},
						{
							internalPrice: 1000,
							externalPrice: 2000,
							internalPriceWeekend: 1500,
							externalPriceWeekend: 2500,
						},
					],
				},
				act: {
					startDate: DateTime.fromObject({ weekday: 1 }).toJSDate(),
					endDate: DateTime.fromObject({ weekday: 1 })
						.plus({ weeks: 1 })
						.toJSDate(),
					participants: {
						internal: 5,
						external: 5,
					},
				},
				expected: {
					ok: true,
					data: {
						totalCost: 2 * 150 + 5 * 100 + 2 * 1500 + 5 * 1000,
					},
				},
			},
			{
				name: "should add the cost of multiple cabins together with different participants and dates",
				arrange: {
					cabins: [
						{
							internalPrice: 100,
							externalPrice: 200,
							internalPriceWeekend: 150,
							externalPriceWeekend: 250,
						},
						{
							internalPrice: 1000,
							externalPrice: 2000,
							internalPriceWeekend: 1500,
							externalPriceWeekend: 2500,
						},
					],
				},
				act: {
					startDate: DateTime.fromObject({ weekday: 6 }).toJSDate(),
					endDate: DateTime.fromObject({ weekday: 5 })
						.plus({ weeks: 1 })
						.toJSDate(),
					participants: {
						internal: 5,
						external: 10,
					},
				},
				expected: {
					ok: true,
					data: {
						totalCost: 1 * 250 + 5 * 200 + 1 * 2500 + 5 * 2000,
					},
				},
			},
			{
				name: "should return InvalidArgumentError if the end date is before the start date",
				arrange: {
					cabins: [
						{
							internalPrice: 100,
							externalPrice: 200,
							internalPriceWeekend: 150,
							externalPriceWeekend: 250,
						},
						{
							internalPrice: 1000,
							externalPrice: 2000,
							internalPriceWeekend: 1500,
							externalPriceWeekend: 2500,
						},
					],
				},
				act: {
					startDate: DateTime.now().plus({ days: 2 }).toJSDate(),
					endDate: DateTime.now().plus({ days: 1 }).toJSDate(),
					participants: {
						internal: 5,
						external: 10,
					},
				},
				expected: {
					ok: false,
					error: expect.any(InvalidArgumentError),
				},
			},
		];

		test.each(testCases)("$name", async ({ arrange, act, expected }) => {
			// Arrange
			const cabinRepository = mock<ICabinRepository>();
			const cabinService = new CabinService(cabinRepository, mock(), mock());
			for (const cabin of arrange.cabins) {
				cabinRepository.getCabinById.mockResolvedValueOnce(mock<Cabin>(cabin));
			}

			// Act
			const result = await cabinService.totalCost({
				...act,
				cabins: arrange.cabins.map(() => ({ id: faker.string.uuid() })),
			});

			// Assert
			expect(result).toEqual(expected);
		});
	});
});

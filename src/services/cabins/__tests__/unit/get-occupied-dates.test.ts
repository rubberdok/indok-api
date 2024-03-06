import { faker } from "@faker-js/faker";
import { type DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import { range } from "lodash-es";
import { DateTime } from "luxon";
import type { BookingType } from "~/domain/cabins.js";
import { makeMockContext } from "~/lib/context.js";
import { CabinService, type ICabinRepository } from "../../service.js";

describe("CabinService", () => {
	let cabinService: CabinService;
	let mockCabinRepository: DeepMockProxy<ICabinRepository>;

	beforeAll(() => {
		mockCabinRepository = mockDeep<ICabinRepository>();
		cabinService = new CabinService(mockCabinRepository, mock(), mock());
	});

	describe("#getOccupiedDates", () => {
		it("returns all occupied dates for a cabin", async () => {
			const booking1 = {
				...mock<BookingType>(),
				startDate: DateTime.now().plus({ days: 1 }).toJSDate(),
				endDate: DateTime.now().plus({ days: 3 }).toJSDate(),
			};

			const booking2 = {
				...mock<BookingType>(),
				startDate: DateTime.now().plus({ days: 5 }).toJSDate(),
				endDate: DateTime.now().plus({ days: 7 }).toJSDate(),
			};

			mockCabinRepository.findManyBookings.mockResolvedValue({
				ok: true,
				data: {
					bookings: [booking1, booking2],
					total: 2,
				},
			});

			const result = await cabinService.getOccupiedDates(makeMockContext(), {
				cabinId: faker.string.uuid(),
			});

			if (!result.ok) throw result.error;

			const { days } = result.data;

			for (const day of range(1, 9)) {
				const date = DateTime.now()
					.plus({ days: day })
					.startOf("day")
					.toJSDate();
				if (day === 4 || day === 8) {
					expect(days).not.toContainEqual(date);
				} else {
					expect(days).toContainEqual(date);
				}
			}
		});
	});
});

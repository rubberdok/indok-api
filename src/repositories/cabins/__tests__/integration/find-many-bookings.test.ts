import { faker } from "@faker-js/faker";
import { DateTime } from "luxon";
import { makeMockContext } from "~/lib/context.js";
import { makeDependencies } from "./dependencies.js";

describe("CabinRepository", () => {
	describe("#findManyBookings", () => {
		it("returns all bookings for a cabin and total count", async () => {
			const {
				cabinRepository,
				oksen,
				oksenBooking,
				bothBooking,
				bjørnenBooking,
			} = await makeDependencies();

			const result = await cabinRepository.findManyBookings(makeMockContext(), {
				cabinId: oksen.id,
			});

			expect(result).toEqual({
				ok: true,
				data: {
					bookings: expect.arrayContaining([oksenBooking, bothBooking]),
					total: expect.any(Number),
				},
			});

			expect(result).toEqual({
				ok: true,
				data: {
					bookings: expect.not.arrayContaining([bjørnenBooking]),
					total: expect.any(Number),
				},
			});
		});

		it("returns all bookings total count", async () => {
			const { cabinRepository, oksenBooking, bothBooking, bjørnenBooking } =
				await makeDependencies();

			const result = await cabinRepository.findManyBookings(makeMockContext());

			expect(result).toEqual({
				ok: true,
				data: {
					bookings: expect.arrayContaining([
						oksenBooking,
						bothBooking,
						bjørnenBooking,
					]),
					total: expect.any(Number),
				},
			});
		});

		it("returns empty array if cabin with the id does not exist", async () => {
			const { cabinRepository } = await makeDependencies();

			const result = await cabinRepository.findManyBookings(makeMockContext(), {
				cabinId: faker.string.uuid(),
			});

			expect(result).toEqual({
				ok: true,
				data: {
					bookings: [],
					total: 0,
				},
			});
		});

		it("returns only bookings matching status", async () => {
			const { cabinRepository, makeBooking, oksen } = await makeDependencies();

			const confirmedBooking = await makeBooking({
				cabins: [{ id: oksen.id }],
				status: "CONFIRMED",
				endDate: DateTime.now().plus({ days: 4 }).toJSDate(),
				startDate: DateTime.now().plus({ days: 1 }).toJSDate(),
			});

			const pendingBooking = await makeBooking({
				cabins: [{ id: oksen.id }],
				status: "PENDING",
				endDate: DateTime.now().plus({ days: 4 }).toJSDate(),
				startDate: DateTime.now().plus({ days: 1 }).toJSDate(),
			});

			const result = await cabinRepository.findManyBookings(makeMockContext(), {
				cabinId: oksen.id,
				bookingStatus: "CONFIRMED",
			});

			expect(result).toEqual({
				ok: true,
				data: {
					bookings: expect.arrayContaining([confirmedBooking]),
					total: expect.any(Number),
				},
			});

			expect(result).toEqual({
				ok: true,
				data: {
					bookings: expect.not.arrayContaining([pendingBooking]),
					total: expect.any(Number),
				},
			});
		});
	});
});

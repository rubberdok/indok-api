import { DateTime } from "luxon";
import { makeDependencies } from "./dependencies.js";

describe("CabinRepository", () => {
	describe("#getOverlappingBookings", () => {
		it("should return an overlapping booking for the same cabin", async () => {
			const { oksen, oksenBooking, cabinRepository, makeBooking } =
				await makeDependencies();

			const booking = await makeBooking({
				cabins: [{ id: oksen.id }],
				startDate: DateTime.fromJSDate(oksenBooking.startDate)
					.minus({ days: 1 })
					.toJSDate(),
				endDate: DateTime.fromJSDate(oksenBooking.endDate)
					.plus({ days: 1 })
					.toJSDate(),
				status: "PENDING",
			});

			const actual = await cabinRepository.getOverlappingBookings(booking, {
				status: "CONFIRMED",
			});

			expect(actual).toEqual({
				ok: true,
				data: {
					bookings: [expect.objectContaining({ id: oksenBooking.id })],
				},
			});
		});

		it("should return an overlapping booking where at least one cabin is the same", async () => {
			const { oksen, bothBooking, makeBooking, cabinRepository } =
				await makeDependencies();

			const booking = await makeBooking({
				cabins: [{ id: oksen.id }],
				startDate: DateTime.fromJSDate(bothBooking.startDate)
					.minus({ days: 1 })
					.toJSDate(),
				endDate: DateTime.fromJSDate(bothBooking.endDate)
					.plus({ days: 1 })
					.toJSDate(),
				status: "PENDING",
			});

			const actual = await cabinRepository.getOverlappingBookings(booking, {
				status: "CONFIRMED",
			});

			expect(actual).toEqual({
				ok: true,
				data: {
					bookings: [expect.objectContaining({ id: bothBooking.id })],
				},
			});
		});

		it("should return all bookings where at least one cabin overlaps", async () => {
			const {
				oksen,
				oksenBooking,
				bjørnenBooking,
				bjørnen,
				makeBooking,
				cabinRepository,
			} = await makeDependencies();

			const booking = await makeBooking({
				cabins: [{ id: oksen.id }, { id: bjørnen.id }],
				startDate: DateTime.fromJSDate(oksenBooking.startDate)
					.minus({ days: 1 })
					.toJSDate(),
				endDate: DateTime.fromJSDate(oksenBooking.endDate)
					.plus({ days: 1 })
					.toJSDate(),
				status: "PENDING",
			});

			const actual = await cabinRepository.getOverlappingBookings(booking, {
				status: "CONFIRMED",
			});

			expect(actual).toEqual({
				ok: true,
				data: {
					bookings: expect.arrayContaining([
						expect.objectContaining({ id: oksenBooking.id }),
						expect.objectContaining({ id: bjørnenBooking.id }),
					]),
				},
			});
		});

		it("should return a booking where startDate < existingStartDate and endDate > existingStartDate", async () => {
			const { oksen, bothBooking, bjørnen, makeBooking, cabinRepository } =
				await makeDependencies();

			const booking = await makeBooking({
				cabins: [{ id: oksen.id }, { id: bjørnen.id }],
				startDate: DateTime.fromJSDate(bothBooking.startDate)
					.minus({ days: 1 })
					.toJSDate(),
				endDate: DateTime.fromJSDate(bothBooking.endDate)
					.plus({ days: 1 })
					.toJSDate(),
				status: "PENDING",
			});

			const actual = await cabinRepository.getOverlappingBookings(booking, {
				status: "CONFIRMED",
			});

			expect(actual).toEqual({
				ok: true,
				data: {
					bookings: [expect.objectContaining({ id: bothBooking.id })],
				},
			});
		});

		it("should return a booking where existingStartDate < startDate and endDate < existingEndDate", async () => {
			const { oksen, bothBooking, bjørnen, makeBooking, cabinRepository } =
				await makeDependencies();

			const booking = await makeBooking({
				cabins: [{ id: oksen.id }, { id: bjørnen.id }],
				startDate: DateTime.fromJSDate(bothBooking.startDate)
					.minus({ days: 1 })
					.toJSDate(),
				endDate: DateTime.fromJSDate(bothBooking.endDate)
					.minus({ days: 1 })
					.toJSDate(),
				status: "PENDING",
			});

			const actual = await cabinRepository.getOverlappingBookings(booking, {
				status: "CONFIRMED",
			});

			expect(actual).toEqual({
				ok: true,
				data: {
					bookings: [expect.objectContaining({ id: bothBooking.id })],
				},
			});
		});

		it("should return a booking where startDate < existingEndDate and endDate > existingEndDate", async () => {
			const { oksen, bothBooking, bjørnen, makeBooking, cabinRepository } =
				await makeDependencies();

			const booking = await makeBooking({
				cabins: [{ id: oksen.id }, { id: bjørnen.id }],
				startDate: DateTime.fromJSDate(bothBooking.endDate)
					.minus({ days: 1 })
					.toJSDate(),
				endDate: DateTime.fromJSDate(bothBooking.endDate)
					.plus({ days: 1 })
					.toJSDate(),
				status: "PENDING",
			});

			const actual = await cabinRepository.getOverlappingBookings(booking, {
				status: "CONFIRMED",
			});

			expect(actual).toEqual({
				ok: true,
				data: {
					bookings: [expect.objectContaining({ id: bothBooking.id })],
				},
			});
		});

		it("should return no bookings if there is no overlap", async () => {
			const { oksen, bothBooking, bjørnen, makeBooking, cabinRepository } =
				await makeDependencies();

			const booking = await makeBooking({
				cabins: [{ id: oksen.id }, { id: bjørnen.id }],
				startDate: DateTime.fromJSDate(bothBooking.endDate)
					.plus({ years: 1 })
					.toJSDate(),
				endDate: DateTime.fromJSDate(bothBooking.endDate)
					.plus({ years: 1 })
					.toJSDate(),
				status: "PENDING",
			});

			const actual = await cabinRepository.getOverlappingBookings(booking, {
				status: "CONFIRMED",
			});

			expect(actual).toEqual({
				ok: true,
				data: {
					bookings: [],
				},
			});
		});
	});
});

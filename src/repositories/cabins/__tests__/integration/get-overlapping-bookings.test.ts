import { faker } from "@faker-js/faker";
import { DateTime } from "luxon";
import type { BookingStatus, BookingType } from "~/domain/cabins.js";
import prisma from "~/lib/prisma.js";
import { CabinRepository } from "../../repository.js";

describe("CabinRepository", () => {
	let cabinRepository: CabinRepository;

	beforeAll(() => {
		cabinRepository = new CabinRepository(prisma);
	});

	describe("#getOverlappingBookings", () => {
		it("should return an overlapping booking for the same cabin", async () => {
			const { oksen, oksenBooking } = await makeDependencies();

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
			const { oksen, bothBooking } = await makeDependencies();

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
			const { oksen, oksenBooking, bjørnenBooking, bjørnen } =
				await makeDependencies();

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
			const { oksen, bothBooking, bjørnen } = await makeDependencies();

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
			const { oksen, bothBooking, bjørnen } = await makeDependencies();

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
			const { oksen, bothBooking, bjørnen } = await makeDependencies();

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
			const { oksen, bothBooking, bjørnen } = await makeDependencies();

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

	async function makeDependencies() {
		const oksen = await cabinRepository.createCabin({
			name: faker.word.adjective(),
			capacity: faker.number.int({ min: 1, max: 10 }),
			internalPrice: faker.number.int({ min: 100, max: 1000 }),
			externalPrice: faker.number.int({ min: 100, max: 1000 }),
		});
		if (!oksen.ok) throw oksen.error;
		const bjørnen = await cabinRepository.createCabin({
			name: faker.word.adjective(),
			capacity: faker.number.int({ min: 1, max: 10 }),
			internalPrice: faker.number.int({ min: 100, max: 1000 }),
			externalPrice: faker.number.int({ min: 100, max: 1000 }),
		});
		if (!bjørnen.ok) throw bjørnen.error;

		const oksenBooking = await makeBooking({
			cabins: [{ id: oksen.data.cabin.id }],
			startDate: DateTime.now().plus({ days: 1 }).toJSDate(),
			endDate: DateTime.now().plus({ days: 4 }).toJSDate(),
			status: "CONFIRMED",
		});
		const bjørnenBooking = await makeBooking({
			cabins: [{ id: bjørnen.data.cabin.id }],
			startDate: DateTime.now().plus({ days: 1 }).toJSDate(),
			endDate: DateTime.now().plus({ days: 4 }).toJSDate(),
			status: "CONFIRMED",
		});
		const bothBooking = await makeBooking({
			cabins: [{ id: oksen.data.cabin.id }, { id: bjørnen.data.cabin.id }],
			startDate: DateTime.now().plus({ days: 5 }).toJSDate(),
			endDate: DateTime.now().plus({ days: 10 }).toJSDate(),
			status: "CONFIRMED",
		});

		return {
			oksen: oksen.data.cabin,
			bjørnen: bjørnen.data.cabin,
			oksenBooking,
			bjørnenBooking,
			bothBooking,
		};
	}

	async function makeBooking(params: {
		cabins: { id: string }[];
		startDate: Date;
		endDate: Date;
		status: BookingStatus;
	}): Promise<BookingType> {
		const { cabins, startDate, endDate, status } = params;
		const createBookingResult = await cabinRepository.createBooking({
			cabins,
			startDate,
			endDate,
			email: faker.internet.exampleEmail(),
			firstName: faker.person.firstName(),
			lastName: faker.person.lastName(),
			phoneNumber: faker.phone.number(),
			id: faker.string.uuid(),
			status,
		});
		if (!createBookingResult.ok) throw createBookingResult.error;
		return createBookingResult.data.booking;
	}
});

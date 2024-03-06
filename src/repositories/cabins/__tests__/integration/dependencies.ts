import { faker } from "@faker-js/faker";
import { DateTime } from "luxon";
import type { BookingStatus, BookingType } from "~/domain/cabins.js";
import prisma from "~/lib/prisma.js";
import { CabinRepository } from "../../repository.js";

async function makeDependencies() {
	const cabinRepository = new CabinRepository(prisma);

	const oksen = await cabinRepository.createCabin({
		name: faker.word.adjective(),
		capacity: faker.number.int({ min: 1, max: 10 }),
		internalPrice: faker.number.int({ min: 100, max: 1000 }),
		externalPrice: faker.number.int({ min: 100, max: 1000 }),
		internalPriceWeekend: faker.number.int({ min: 100, max: 1000 }),
		externalPriceWeekend: faker.number.int({ min: 100, max: 1000 }),
	});
	if (!oksen.ok) throw oksen.error;
	const bjørnen = await cabinRepository.createCabin({
		name: faker.word.adjective(),
		capacity: faker.number.int({ min: 1, max: 10 }),
		internalPrice: faker.number.int({ min: 100, max: 1000 }),
		externalPrice: faker.number.int({ min: 100, max: 1000 }),
		internalPriceWeekend: faker.number.int({ min: 100, max: 1000 }),
		externalPriceWeekend: faker.number.int({ min: 100, max: 1000 }),
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
			internalParticipantsCount: faker.number.int({ min: 1, max: 10 }),
			externalParticipantsCount: faker.number.int({ min: 1, max: 10 }),
			totalCost: faker.number.int({ min: 100, max: 1000 }),
			createdAt: new Date(),
			questions: faker.lorem.sentence(),
			feedback: faker.lorem.sentence(),
		});
		if (!createBookingResult.ok) throw createBookingResult.error;
		return createBookingResult.data.booking;
	}

	return {
		oksen: oksen.data.cabin,
		bjørnen: bjørnen.data.cabin,
		oksenBooking,
		bjørnenBooking,
		bothBooking,
		makeBooking,
		cabinRepository,
	};
}

export { makeDependencies };

import { faker } from "@faker-js/faker";
import type { Prisma, PrismaClient } from "@prisma/client";
import { DateTime } from "luxon";
import { BookingStatus } from "~/domain/cabins.js";

faker.seed(312849038190);
const oksenId = faker.string.uuid();
const bjornenId = faker.string.uuid();

const cabinCreateInput: Prisma.CabinCreateInput[] = [
	{
		id: oksenId,
		name: "Oksen",
		capacity: 18,
		internalPrice: 1100,
		internalPriceWeekend: 1100,
		externalPrice: 3950,
		externalPriceWeekend: 5400,
	},
	{
		id: bjornenId,
		name: "Bjørnen",
		capacity: 18,
		internalPrice: 1100,
		internalPriceWeekend: 1100,
		externalPrice: 3950,
		externalPriceWeekend: 5400,
	},
];

const bookingCreateInput: Prisma.BookingCreateInput[] = [
	{
		id: faker.string.uuid(),
		startDate: DateTime.now().plus({ weeks: 1 }).toJSDate(),
		endDate: DateTime.now().plus({ weeks: 1, days: 3 }).toJSDate(),
		status: BookingStatus.PENDING,
		email: faker.internet.exampleEmail(),
		phoneNumber: faker.phone.number(),
		firstName: faker.person.firstName(),
		lastName: faker.person.lastName(),
		internalParticipantsCount: 5,
		externalParticipantsCount: 10,
		totalCost: 3 * 3950,
		questions: faker.lorem.sentence(),
		cabins: {
			connect: [
				{
					id: oksenId,
				},
				{
					id: bjornenId,
				},
			],
		},
	},
	{
		id: faker.string.uuid(),
		startDate: DateTime.now().plus({ weeks: 3 }).toJSDate(),
		endDate: DateTime.now().plus({ weeks: 4 }).toJSDate(),
		status: BookingStatus.PENDING,
		email: faker.internet.exampleEmail(),
		phoneNumber: faker.phone.number(),
		firstName: faker.person.firstName(),
		lastName: faker.person.lastName(),
		internalParticipantsCount: 5,
		externalParticipantsCount: 10,
		totalCost: 1 * 250 + 5 * 200 + 1 * 2500 + 5 * 2000,
		questions: faker.lorem.sentence(),
		cabins: {
			connect: [
				{
					id: oksenId,
				},
				{
					id: bjornenId,
				},
			],
		},
	},
	{
		id: faker.string.uuid(),
		startDate: DateTime.now().plus({ weeks: 5 }).toJSDate(),
		endDate: DateTime.now().plus({ weeks: 7 }).toJSDate(),
		status: BookingStatus.CONFIRMED,
		email: faker.internet.exampleEmail(),
		phoneNumber: faker.phone.number(),
		firstName: faker.person.firstName(),
		lastName: faker.person.lastName(),
		internalParticipantsCount: 5,
		externalParticipantsCount: 10,
		totalCost: 1 * 250 + 5 * 200 + 1 * 2500 + 5 * 2000,
		questions: faker.lorem.sentence(),
		cabins: {
			connect: [
				{
					id: bjornenId,
				},
			],
		},
	},
	{
		id: faker.string.uuid(),
		startDate: DateTime.now().plus({ days: 1 }).toJSDate(),
		endDate: DateTime.now().plus({ days: 3 }).toJSDate(),
		status: BookingStatus.CONFIRMED,
		email: faker.internet.exampleEmail(),
		phoneNumber: faker.phone.number(),
		firstName: faker.person.firstName(),
		lastName: faker.person.lastName(),
		internalParticipantsCount: 5,
		externalParticipantsCount: 10,
		totalCost: 1 * 250 + 5 * 200 + 1 * 2500 + 5 * 2000,
		questions: faker.lorem.sentence(),
		cabins: {
			connect: [
				{
					id: oksenId,
				},
			],
		},
	},
	{
		id: faker.string.uuid(),
		startDate: DateTime.now().plus({ weeks: 8 }).toJSDate(),
		endDate: DateTime.now().plus({ weeks: 12 }).toJSDate(),
		status: BookingStatus.CONFIRMED,
		email: faker.internet.exampleEmail(),
		phoneNumber: faker.phone.number(),
		firstName: faker.person.firstName(),
		lastName: faker.person.lastName(),
		internalParticipantsCount: 5,
		externalParticipantsCount: 10,
		totalCost: 1 * 250 + 5 * 200 + 1 * 2500 + 5 * 2000,
		questions: faker.lorem.sentence(),
		cabins: {
			connect: [
				{
					id: oksenId,
				},
			],
		},
	},
	{
		id: faker.string.uuid(),
		startDate: DateTime.now().plus({ weeks: 8 }).toJSDate(),
		endDate: DateTime.now().plus({ days: 20 }).toJSDate(),
		status: BookingStatus.REJECTED,
		email: faker.internet.exampleEmail(),
		phoneNumber: faker.phone.number(),
		firstName: faker.person.firstName(),
		lastName: faker.person.lastName(),
		internalParticipantsCount: 5,
		externalParticipantsCount: 10,
		totalCost: 1 * 250 + 5 * 200 + 1 * 2500 + 5 * 2000,
		questions: faker.lorem.sentence(),
		cabins: {
			connect: [
				{
					id: oksenId,
				},
			],
		},
	},
];

const createBookingSemesterInput: Prisma.BookingSemesterCreateInput[] = [
	{
		id: faker.string.uuid(),
		semester: "FALL",
		startAt: DateTime.fromObject({
			month: 8,
			day: 1,
			year: DateTime.now().year,
		}).toJSDate(),
		endAt: DateTime.fromObject({
			month: 12,
			day: 31,
			year: DateTime.now().year,
		}).toJSDate(),
		bookingsEnabled: true,
	},
	{
		id: faker.string.uuid(),
		semester: "SPRING",
		startAt: DateTime.fromObject({
			month: 1,
			day: 1,
			year: DateTime.now().year,
		}).toJSDate(),
		endAt: DateTime.fromObject({
			month: 7,
			day: 31,
			year: DateTime.now().year,
		}).toJSDate(),
		bookingsEnabled: true,
	},
];

export const load = async (db: PrismaClient) => {
	console.log("Seeding cabins...");
	for (const cabin of cabinCreateInput) {
		await db.cabin.upsert({
			where: {
				id: cabin.id,
			},
			update: cabin,
			create: cabin,
		});
	}
	const cabins = await db.cabin.findMany({
		select: {
			id: true,
			name: true,
		},
	});

	console.log("Seeding bookings...");
	for (const booking of bookingCreateInput) {
		await db.booking.upsert({
			where: {
				id: booking.id,
			},
			update: booking,
			create: booking,
		});
	}
	const bookings = await db.booking.findMany({
		select: {
			id: true,
			cabins: {
				select: {
					id: true,
				},
			},
			status: true,
			firstName: true,
			lastName: true,
		},
	});

	console.log("Seeding booking semesters...");
	for (const semester of createBookingSemesterInput) {
		await db.bookingSemester.upsert({
			where: {
				id: semester.id,
			},
			update: semester,
			create: semester,
		});
	}
	const bookingSemesters = await db.bookingSemester.findMany({
		select: {
			id: true,
			semester: true,
		},
	});

	console.log("Seeding booking contact...");
	await db.bookingContact.upsert({
		where: {
			id: "booking-contact",
		},
		update: {},
		create: {
			email: faker.internet.exampleEmail(),
			phoneNumber: faker.phone.number(),
			name: `${faker.person.firstName()}${faker.person.lastName()}`,
		},
	});

	return { cabins, bookings, bookingSemesters };
};

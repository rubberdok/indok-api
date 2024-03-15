import { faker } from "@faker-js/faker";
import { BookingStatus } from "~/domain/cabins.js";
import { NotFoundError } from "~/domain/errors.js";
import prisma from "~/lib/prisma.js";
import { CabinRepository } from "../../index.js";

describe("Cabin Repository", () => {
	describe("createBooking", () => {
		let cabinRepository: CabinRepository;

		beforeAll(() => {
			cabinRepository = new CabinRepository(prisma);
		});

		it("should create a booking for a single cabin", async () => {
			/**
			 * Arrange
			 *
			 * 1. create a cabin
			 */
			// 1.
			const cabin = await prisma.cabin.create({
				data: {
					name: faker.string.sample(),
					capacity: faker.number.int({ max: 10 }),
					internalPrice: faker.number.int({ max: 2000 }),
					externalPrice: faker.number.int({ max: 2000 }),
					externalPriceWeekend: faker.number.int({ max: 2000 }),
					internalPriceWeekend: faker.number.int({ max: 2000 }),
				},
			});

			/**
			 * Act
			 *
			 * Create a new booking
			 */
			const actual = await cabinRepository.createBooking({
				status: "PENDING",
				id: faker.string.uuid(),
				cabins: [{ id: cabin.id }],
				startDate: faker.date.soon(),
				endDate: faker.date.soon(),
				email: faker.internet.exampleEmail(),
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				phoneNumber: faker.phone.number(),
				externalParticipantsCount: faker.number.int({ max: 10 }),
				internalParticipantsCount: faker.number.int({ max: 10 }),
				totalCost: faker.number.int({ max: 2000 }),
				createdAt: new Date(),
				feedback: faker.lorem.sentence(),
				questions: faker.lorem.sentence(),
			});

			/**
			 * Assert
			 *
			 * The booking should be created with default status PENDING
			 */
			expect(actual).toEqual({
				ok: true,
				data: {
					booking: expect.objectContaining({
						cabins: expect.arrayContaining([
							expect.objectContaining({ id: cabin.id }),
						]),
						status: BookingStatus.PENDING,
					}),
				},
			});
		});

		it("should create a booking multiple cabins", async () => {
			/**
			 * Arrange
			 *
			 * 1. create two cabins
			 */
			// 1.
			const cabin1 = await prisma.cabin.create({
				data: {
					name: faker.string.sample(),
					capacity: faker.number.int({ max: 10 }),
					internalPrice: faker.number.int({ max: 2000 }),
					externalPrice: faker.number.int({ max: 2000 }),
					externalPriceWeekend: faker.number.int({ max: 2000 }),
					internalPriceWeekend: faker.number.int({ max: 2000 }),
				},
			});
			const cabin2 = await prisma.cabin.create({
				data: {
					name: faker.string.sample(),
					capacity: faker.number.int({ max: 10 }),
					internalPrice: faker.number.int({ max: 2000 }),
					externalPrice: faker.number.int({ max: 2000 }),
					externalPriceWeekend: faker.number.int({ max: 2000 }),
					internalPriceWeekend: faker.number.int({ max: 2000 }),
				},
			});

			/**
			 * Act
			 *
			 * Create a new booking
			 */
			const actual = await cabinRepository.createBooking({
				status: "PENDING",
				id: faker.string.uuid(),
				cabins: [{ id: cabin1.id }, { id: cabin2.id }],
				startDate: faker.date.soon(),
				endDate: faker.date.soon(),
				email: faker.internet.exampleEmail(),
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				phoneNumber: faker.phone.number(),
				externalParticipantsCount: faker.number.int({ max: 10 }),
				internalParticipantsCount: faker.number.int({ max: 10 }),
				totalCost: faker.number.int({ max: 2000 }),
				createdAt: new Date(),
				feedback: faker.lorem.sentence(),
				questions: faker.lorem.sentence(),
			});

			/**
			 * Assert
			 *
			 * The booking should be created with default status PENDING
			 */
			expect(actual).toEqual({
				ok: true,
				data: {
					booking: expect.objectContaining({
						cabins: expect.arrayContaining([
							expect.objectContaining({ id: cabin1.id }),
							expect.objectContaining({ id: cabin2.id }),
						]),
						status: BookingStatus.PENDING,
					}),
				},
			});
		});

		it("should return NotFoundError if at least one of the cabins don't exist", async () => {
			/**
			 * Arrange
			 *
			 * 1. create a cabins
			 */
			// 1.
			const cabin = await prisma.cabin.create({
				data: {
					name: faker.string.sample(),
					capacity: faker.number.int({ max: 10 }),
					internalPrice: faker.number.int({ max: 2000 }),
					externalPrice: faker.number.int({ max: 2000 }),
					externalPriceWeekend: faker.number.int({ max: 2000 }),
					internalPriceWeekend: faker.number.int({ max: 2000 }),
				},
			});

			/**
			 * Act
			 *
			 * Create a new booking
			 */
			const actual = await cabinRepository.createBooking({
				status: "PENDING",
				id: faker.string.uuid(),
				cabins: [{ id: cabin.id }, { id: faker.string.uuid() }],
				startDate: faker.date.soon(),
				endDate: faker.date.soon(),
				email: faker.internet.exampleEmail(),
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				phoneNumber: faker.phone.number(),
				externalParticipantsCount: faker.number.int({ max: 10 }),
				internalParticipantsCount: faker.number.int({ max: 10 }),
				totalCost: faker.number.int({ max: 2000 }),
				createdAt: new Date(),
				feedback: faker.lorem.sentence(),
				questions: faker.lorem.sentence(),
			});

			/**
			 * Assert
			 *
			 * The booking should not be created and return NotFoundError
			 */
			expect(actual).toEqual({
				ok: false,
				error: expect.any(NotFoundError),
			});
		});
	});
});

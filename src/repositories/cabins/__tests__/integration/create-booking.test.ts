import { faker } from "@faker-js/faker";
import { BookingStatus } from "@prisma/client";
import prisma from "~/lib/prisma.js";
import { CabinRepository } from "../../index.js";

describe("Cabin Repository", () => {
	describe("createBooking", () => {
		let cabinRepository: CabinRepository;

		beforeAll(() => {
			cabinRepository = new CabinRepository(prisma);
		});

		it("should create a booking", async () => {
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
				},
			});

			/**
			 * Act
			 *
			 * Create a new booking
			 */
			const actual = cabinRepository.createBooking({
				cabinId: cabin.id,
				startDate: faker.date.soon(),
				endDate: faker.date.soon(),
				email: faker.internet.exampleEmail(),
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				phoneNumber: faker.phone.number(),
			});

			/**
			 * Assert
			 *
			 * The booking should be created with default status PENDING
			 */
			expect(actual).resolves.toEqual({
				cabinId: cabin.id,
				status: BookingStatus.PENDING,
				id: expect.any(String),
				startDate: expect.any(Date),
				endDate: expect.any(Date),
				email: expect.any(String),
				firstName: expect.any(String),
				lastName: expect.any(String),
				phoneNumber: expect.any(String),
				createdAt: expect.any(Date),
				updatedAt: expect.any(Date),
			});
		});
	});
});

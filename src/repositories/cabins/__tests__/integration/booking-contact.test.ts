import { faker } from "@faker-js/faker";
import prisma from "~/lib/prisma.js";
import { CabinRepository } from "../../repository.js";

describe("CabinRepository", () => {
	let cabinRepository: CabinRepository;

	beforeAll(() => {
		cabinRepository = new CabinRepository(prisma);
	});

	describe("updateBookingContact", () => {
		it("should create a booking contact if it does not exist", async () => {
			await prisma.bookingContact.deleteMany();

			const name = faker.person.fullName();
			const email = faker.internet.email();
			const phoneNumber = faker.phone.number();

			const bookingContact = await cabinRepository.updateBookingContact({
				name,
				email,
				phoneNumber,
			});

			expect(bookingContact).toEqual(
				expect.objectContaining({
					id: "booking-contact",
					name,
					email,
					phoneNumber,
				}),
			);
		});

		it("should update the booking contact if it already exists", async () => {
			/**
			 * Arrange
			 *
			 * Create a booking contact
			 */
			await prisma.bookingContact.deleteMany();
			await cabinRepository.updateBookingContact({
				name: faker.person.fullName(),
				email: faker.internet.email(),
				phoneNumber: faker.phone.number(),
			});

			/**
			 * Act
			 *
			 * Update the booking contact
			 */
			const name = faker.person.fullName();
			const email = faker.internet.email();
			const phoneNumber = faker.phone.number();

			const actual = await cabinRepository.updateBookingContact({
				name,
				email,
				phoneNumber,
			});

			/**
			 * Assert
			 *
			 * The booking contact should be updated
			 */
			expect(actual).toEqual(
				expect.objectContaining({
					id: "booking-contact",
					name,
					email,
					phoneNumber,
				}),
			);
		});
	});

	describe("getBookingContact", () => {
		it("should return the booking contact if it exists", async () => {
			/**
			 * Arrange
			 *
			 * Create a booking contact
			 */
			await prisma.bookingContact.deleteMany();
			const name = faker.person.fullName();
			const email = faker.internet.email();
			const phoneNumber = faker.phone.number();
			await cabinRepository.updateBookingContact({
				name,
				email,
				phoneNumber,
			});

			/**
			 * Act
			 *
			 * Call getBookingContact
			 */
			const actual = await cabinRepository.getBookingContact();

			/**
			 * Assert
			 *
			 * The booking contact should be returned
			 */
			expect(actual).toEqual(
				expect.objectContaining({
					id: "booking-contact",
					name,
					email,
					phoneNumber,
				}),
			);
		});

		it("should return a blank booking contact if it does not exist", async () => {
			/**
			 * Arrange
			 *
			 * Delete all booking contacts
			 */
			await prisma.bookingContact.deleteMany();

			/**
			 * Act
			 *
			 * Call getBookingContact
			 */
			const actual = await cabinRepository.getBookingContact();

			/**
			 * Assert
			 *
			 * A blank booking contact should be returned
			 */
			expect(actual).toEqual(
				expect.objectContaining({
					id: "booking-contact",
					name: "",
					email: "",
					phoneNumber: "",
				}),
			);
		});
	});
});

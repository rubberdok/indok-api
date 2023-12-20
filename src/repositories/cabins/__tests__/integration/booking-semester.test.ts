import { InvalidArgumentError, NotFoundError } from "~/domain/errors.js";
import prisma from "~/lib/prisma.js";
import { CabinRepository } from "../../repository.js";

describe("CabinRepository", () => {
	let cabinRepository: CabinRepository;

	beforeAll(() => {
		cabinRepository = new CabinRepository(prisma);
	});

	describe("createBookingSemester", () => {
		it("should create a booking semester", async () => {
			await prisma.bookingSemester.deleteMany();

			const bookingSemester = await cabinRepository.createBookingSemester({
				semester: "SPRING",
				startAt: new Date(2020, 0, 1),
				endAt: new Date(2020, 0, 2),
				bookingsEnabled: true,
			});

			expect(bookingSemester).toEqual({
				semester: "SPRING",
				startAt: new Date(2020, 0, 1),
				endAt: new Date(2020, 0, 2),
				bookingsEnabled: true,
				createdAt: expect.any(Date),
				updatedAt: expect.any(Date),
				id: expect.any(String),
			});
		});

		it("should create a booking semester if the other semester already exists", async () => {
			/**
			 * Arrange
			 *
			 * Create a booking semester for SPRING
			 */
			await prisma.bookingSemester.deleteMany();
			await cabinRepository.createBookingSemester({
				semester: "SPRING",
				startAt: new Date(2020, 0, 1),
				endAt: new Date(2020, 0, 2),
				bookingsEnabled: true,
			});

			/**
			 * Act
			 *
			 * Create a booking semester for "FALL"
			 */
			const bookingSemester = await cabinRepository.createBookingSemester({
				semester: "FALL",
				startAt: new Date(2020, 0, 1),
				endAt: new Date(2020, 0, 2),
				bookingsEnabled: true,
			});

			/**
			 * Assert
			 *
			 * Expect the booking semester to be created
			 */
			expect(bookingSemester).toEqual({
				semester: "FALL",
				startAt: new Date(2020, 0, 1),
				endAt: new Date(2020, 0, 2),
				bookingsEnabled: true,
				createdAt: expect.any(Date),
				updatedAt: expect.any(Date),
				id: expect.any(String),
			});
		});

		it("should should raise InvalidArgumentError if a booking semester for that semester already exists", async () => {
			await prisma.bookingSemester.deleteMany();
			/**
			 * Arrange
			 *
			 * Create a booking semester
			 */
			await cabinRepository.createBookingSemester({
				semester: "SPRING",
				startAt: new Date(2020, 0, 1),
				endAt: new Date(2020, 0, 2),
				bookingsEnabled: true,
			});

			/**
			 * Act
			 *
			 * Call createBookingSemester with the same semester
			 */
			const result = cabinRepository.createBookingSemester({
				semester: "SPRING",
				startAt: new Date(2021, 0, 1),
				endAt: new Date(2021, 0, 2),
				bookingsEnabled: true,
			});

			/**
			 * Assert
			 *
			 * Expect createBookingSemester to throw an InvalidArgumentError
			 */
			await expect(result).rejects.toThrow(InvalidArgumentError);
		});
	});

	describe("updateBookingSemester", () => {
		it("should update a booking semester", async () => {
			/**
			 * Arrange
			 *
			 * Create a booking semester
			 */
			await prisma.bookingSemester.deleteMany();
			await cabinRepository.createBookingSemester({
				semester: "SPRING",
				startAt: new Date(2020, 0, 1),
				endAt: new Date(2020, 0, 2),
				bookingsEnabled: true,
			});

			/**
			 * Act
			 *
			 * Update the booking semester
			 */
			const bookingSemester = await cabinRepository.updateBookingSemester({
				semester: "SPRING",
				startAt: new Date(2021, 0, 1),
				endAt: new Date(2021, 0, 2),
				bookingsEnabled: true,
			});

			/**
			 * Assert
			 *
			 * Expect the booking semester to be updated
			 */
			expect(bookingSemester).toEqual({
				semester: "SPRING",
				startAt: new Date(2021, 0, 1),
				endAt: new Date(2021, 0, 2),
				bookingsEnabled: true,
				createdAt: expect.any(Date),
				updatedAt: expect.any(Date),
				id: expect.any(String),
			});
		});

		it("should throw NotFoundError if the booking semester does not exist", async () => {
			/**
			 * Arrange
			 *
			 * Delete all booking semesters
			 */
			await prisma.bookingSemester.deleteMany();

			/**
			 * Act
			 *
			 * Call updateBookingSemester
			 */
			const actual = cabinRepository.updateBookingSemester({
				semester: "SPRING",
				startAt: new Date(2021, 0, 1),
				endAt: new Date(2021, 0, 2),
				bookingsEnabled: true,
			});

			/**
			 * Assert
			 *
			 * Expect updateBookingSemester to throw a NotFoundError
			 */
			await expect(actual).rejects.toThrow(NotFoundError);
		});
	});

	describe("getBookingSemester", () => {
		it("should return the booking semester for the given semester", async () => {
			/**
			 * Arrange
			 *
			 * Create a booking semester
			 */
			await prisma.bookingSemester.deleteMany();
			const expected = await cabinRepository.createBookingSemester({
				semester: "SPRING",
				startAt: new Date(2020, 0, 1),
				endAt: new Date(2020, 0, 2),
				bookingsEnabled: true,
			});

			/**
			 * Act
			 *
			 * Call getBookingSemester
			 */
			const actual = await cabinRepository.getBookingSemester("SPRING");

			/**
			 * Assert
			 *
			 * Expect the booking semester to be returned
			 */
			expect(actual).toEqual(expected);
		});

		it("should return null if the booking semester does not exist", async () => {
			/**
			 * Arrange
			 *
			 * Delete all booking semesters
			 */
			await prisma.bookingSemester.deleteMany();

			/**
			 * Act
			 *
			 * Call getBookingSemester
			 */
			const actual = await cabinRepository.getBookingSemester("SPRING");

			/**
			 * Assert
			 *
			 * Expect null to be returned
			 */
			expect(actual).toBeNull();
		});
	});
});

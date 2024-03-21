import { faker } from "@faker-js/faker";
import { BookingTerms } from "~/domain/cabins.js";
import { NotFoundError } from "~/domain/errors.js";
import { makeMockContext } from "~/lib/context.js";
import prisma from "~/lib/prisma.js";
import { Result } from "~/lib/result.js";
import { CabinRepository } from "../../repository.js";

describe("Cabin Repository", () => {
	const cabinRepository = new CabinRepository(prisma);

	describe("#createBookingTerms", () => {
		it("creates a bookingTerms", async () => {
			const file = await prisma.file.create({
				data: {
					name: faker.system.fileName(),
				},
			});

			const result = await cabinRepository.createBookingTerms(
				makeMockContext(),
				{
					fileId: file.id,
				},
			);

			if (!result.ok) throw result.error;
			const { bookingTerms } = result.data;
			expect(bookingTerms).toBeInstanceOf(BookingTerms);
			expect(bookingTerms.fileId).toBe(file.id);
		});
	});

	describe("#getBookingTerms", () => {
		it("returns a bookingTerms with matching id", async () => {
			const bookingTerms = await makeBookingTerms();

			const result = await cabinRepository.getBookingTerms(makeMockContext(), {
				id: bookingTerms.id,
			});

			expect(result).toEqual(Result.success({ bookingTerms }));
		});

		it("returns NotFoundError if there is no matching bookingTerms", async () => {
			const result = await cabinRepository.getBookingTerms(makeMockContext(), {
				id: faker.string.uuid(),
			});

			expect(result).toEqual(Result.error(expect.any(NotFoundError)));
		});

		it("returns the latest bookingTerms ID is not provided", async () => {
			await makeBookingTerms();
			const bookingTerms2 = await makeBookingTerms();

			const result = await cabinRepository.getBookingTerms(
				makeMockContext(),
				{},
			);

			expect(result).toEqual(Result.success({ bookingTerms: bookingTerms2 }));
		});
	});

	async function makeBookingTerms() {
		const file = await prisma.file.create({
			data: {
				name: faker.system.fileName(),
			},
		});

		const createResult = await cabinRepository.createBookingTerms(
			makeMockContext(),
			{
				fileId: file.id,
			},
		);

		if (!createResult.ok) throw createResult.error;
		const { bookingTerms } = createResult.data;
		return bookingTerms;
	}
});

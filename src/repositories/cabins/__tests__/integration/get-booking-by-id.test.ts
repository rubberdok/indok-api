import { faker } from "@faker-js/faker";
import type { PrismaClient } from "@prisma/client";
import { mockDeep } from "jest-mock-extended";
import { InternalServerError, NotFoundError } from "~/domain/errors.js";
import { CabinRepository } from "../../repository.js";
import { makeDependencies } from "./dependencies.js";

describe("CabinRepository", () => {
	describe("#getBookingById", () => {
		it("should return a booking by id", async () => {
			const { cabinRepository, oksenBooking } = await makeDependencies();

			const actual = await cabinRepository.getBookingById(oksenBooking.id);

			expect(actual).toEqual({
				ok: true,
				data: {
					booking: expect.objectContaining({
						id: oksenBooking.id,
					}),
				},
			});
		});

		it("should return NotFoundError if the booking does not exist", async () => {
			const { cabinRepository } = await makeDependencies();

			const actual = await cabinRepository.getBookingById(faker.string.uuid());

			expect(actual).toEqual({
				ok: false,
				error: expect.any(NotFoundError),
			});
		});

		it("should return InternalServerError if an unexpected error occurs", async () => {
			const prisma = mockDeep<PrismaClient>();
			const cabinRepository = new CabinRepository(prisma);

			prisma.booking.findUnique.mockRejectedValueOnce(
				new Error("Unexpected error"),
			);

			const actual = await cabinRepository.getBookingById(faker.string.uuid());

			expect(actual).toEqual({
				ok: false,
				error: expect.any(InternalServerError),
			});
		});
	});
});

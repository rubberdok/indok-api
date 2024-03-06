import { faker } from "@faker-js/faker";
import type { PrismaClient } from "@prisma/client";
import { mockDeep } from "jest-mock-extended";
import { InternalServerError, NotFoundError } from "~/domain/errors.js";
import { CabinRepository } from "../../repository.js";
import { makeDependencies } from "./dependencies.js";

describe("CabinRepository", () => {
	describe("#updateBooking", () => {
		it("should update a booking status", async () => {
			const { cabinRepository, oksenBooking } = await makeDependencies();

			const updateBookingResult = await cabinRepository.updateBooking(
				oksenBooking.id,
				{
					status: "REJECTED",
				},
			);

			expect(updateBookingResult).toEqual({
				ok: true,
				data: {
					booking: expect.objectContaining({
						status: "REJECTED",
					}),
				},
			});
		});

		it("updates feedback", async () => {
			const { cabinRepository, oksenBooking } = await makeDependencies();

			const updateBookingResult = await cabinRepository.updateBooking(
				oksenBooking.id,
				{
					feedback: "New feedback",
				},
			);

			expect(updateBookingResult).toEqual({
				ok: true,
				data: {
					booking: expect.objectContaining({
						feedback: "New feedback",
					}),
				},
			});
		});

		it("should return NotFoundError if the booking does not exist", async () => {
			const { cabinRepository } = await makeDependencies();

			const updateBookingResult = await cabinRepository.updateBooking(
				faker.string.uuid(),
				{
					status: "REJECTED",
				},
			);

			expect(updateBookingResult).toEqual({
				ok: false,
				error: expect.any(NotFoundError),
			});
		});

		it("should return InternalServerError if an unexpected error occurs", async () => {
			const prisma = mockDeep<PrismaClient>();
			const cabinRepository = new CabinRepository(prisma);

			prisma.booking.update.mockRejectedValueOnce(
				new Error("Unexpected error"),
			);

			const updateBookingResult = await cabinRepository.updateBooking(
				faker.string.uuid(),
				{
					status: "REJECTED",
				},
			);

			expect(updateBookingResult).toEqual({
				ok: false,
				error: expect.any(InternalServerError),
			});
		});
	});
});

import { faker } from "@faker-js/faker";
import { Booking } from "~/domain/cabins.js";
import { NotFoundError } from "~/domain/errors.js";
import { makeMockContext } from "~/lib/context.js";
import { Result } from "~/lib/result.js";
import { makeDependencies } from "./dependencies.js";

describe("Cabin service", () => {
	describe("#getBookingByIdAndEmail", () => {
		it("returns a booking if the email matches the booking", async () => {
			const { cabinService, cabinRepository } = makeDependencies();
			const email = faker.internet.email();

			const booking = new Booking({
				id: faker.string.uuid(),
				cabins: [],
				createdAt: faker.date.recent(),
				email,
				endDate: faker.date.recent(),
				externalParticipantsCount: faker.number.int({ max: 10 }),
				feedback: faker.lorem.paragraph(),
				firstName: faker.person.firstName(),
				internalParticipantsCount: faker.number.int({ max: 10 }),
				lastName: faker.person.lastName(),
				phoneNumber: faker.phone.number(),
				questions: faker.lorem.paragraph(),
				startDate: faker.date.recent(),
				status: "PENDING",
				totalCost: faker.number.int({ max: 200 }),
			});

			cabinRepository.getBookingById.mockResolvedValue(
				Result.success({ booking }),
			);

			const result = await cabinService.getBookingByIdAndEmail(
				makeMockContext(),
				{
					id: faker.string.uuid(),
					email,
				},
			);

			expect(result).toEqual(Result.success({ booking }));
		});

		it("returns NotFound if the email does not match the booking", async () => {
			const { cabinService, cabinRepository } = makeDependencies();

			const booking = new Booking({
				id: faker.string.uuid(),
				cabins: [],
				createdAt: faker.date.recent(),
				email: faker.internet.email({ firstName: "test" }),
				endDate: faker.date.recent(),
				externalParticipantsCount: faker.number.int({ max: 10 }),
				feedback: faker.lorem.paragraph(),
				firstName: faker.person.firstName(),
				internalParticipantsCount: faker.number.int({ max: 10 }),
				lastName: faker.person.lastName(),
				phoneNumber: faker.phone.number(),
				questions: faker.lorem.paragraph(),
				startDate: faker.date.recent(),
				status: "PENDING",
				totalCost: faker.number.int({ max: 200 }),
			});

			cabinRepository.getBookingById.mockResolvedValue(
				Result.success({ booking }),
			);

			const result = await cabinService.getBookingByIdAndEmail(
				makeMockContext(),
				{
					id: faker.string.uuid(),
					email: faker.internet.email({ firstName: "not-test" }),
				},
			);

			expect(result).toEqual(Result.error(expect.any(NotFoundError)));
		});
		it("returns NotFound if the repository returns NotFound", async () => {
			const { cabinService, cabinRepository } = makeDependencies();

			cabinRepository.getBookingById.mockResolvedValue(
				Result.error(new NotFoundError("")),
			);

			const result = await cabinService.getBookingByIdAndEmail(
				makeMockContext(),
				{
					id: faker.string.uuid(),
					email: faker.internet.email(),
				},
			);

			expect(result).toEqual(Result.error(expect.any(NotFoundError)));
		});
	});
});

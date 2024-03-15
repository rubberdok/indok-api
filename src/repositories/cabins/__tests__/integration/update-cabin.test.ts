import { faker } from "@faker-js/faker";
import type { Cabin } from "~/domain/cabins.js";
import { NotFoundError } from "~/domain/errors.js";
import { makeMockContext } from "~/lib/context.js";
import { Result } from "~/lib/result.js";
import { makeDependencies } from "./dependencies.js";

describe("Cabin Repository", () => {
	describe("#updateCabin", () => {
		it("updates the cabin", async () => {
			const { cabinRepository, oksen } = await makeDependencies();

			const newFields: Partial<Cabin> = {
				name: faker.word.adjective(),
				capacity: faker.number.int({ min: 1, max: 20 }),
				internalPrice: faker.number.int({ min: 100, max: 1000 }),
				externalPrice: faker.number.int({ min: 100, max: 1000 }),
				externalPriceWeekend: faker.number.int({ min: 100, max: 1000 }),
				internalPriceWeekend: faker.number.int({ min: 100, max: 1000 }),
			};

			const result = await cabinRepository.updateCabin(makeMockContext(), {
				id: oksen.id,
				...newFields,
			});

			expect(result).toEqual({
				ok: true,
				data: {
					cabin: expect.objectContaining(newFields),
				},
			});
		});

		it("returns NotFoundError if the cabin does not exist", async () => {
			const { cabinRepository } = await makeDependencies();

			const result = await cabinRepository.updateCabin(makeMockContext(), {
				id: faker.string.uuid(),
				name: faker.word.adjective(),
			});

			expect(result).toEqual(Result.error(expect.any(NotFoundError)));
		});

		it("only updates permitted fields", async () => {
			const { cabinRepository, oksen } = await makeDependencies();

			const result = await cabinRepository.updateCabin(makeMockContext(), {
				id: oksen.id,
				name: faker.word.adjective(),
				...{ createdAt: new Date() },
			});

			expect(result).toEqual({
				ok: true,
				data: {
					cabin: expect.objectContaining({
						createdAt: oksen.createdAt,
					}),
				},
			});
		});

		it("returns NotFoundError if the id is not a uuid", async () => {
			const { cabinRepository } = await makeDependencies();

			const result = await cabinRepository.updateCabin(makeMockContext(), {
				id: "not-a-uuid",
				name: faker.word.adjective(),
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(NotFoundError),
			});
		});
	});
});

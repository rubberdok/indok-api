import { faker } from "@faker-js/faker";
import { DocumentCategory } from "~/domain/documents.js";
import { NotFoundError } from "~/domain/errors.js";
import { makeMockContext } from "~/lib/context.js";
import prisma from "~/lib/prisma.js";
import { Result } from "~/lib/result.js";
import { buildCategories } from "./categories.js";

describe("Documents repository", () => {
	describe("categories", () => {
		describe("#findMany", () => {
			it("returns document categories", async () => {
				const expected = new DocumentCategory(
					await prisma.documentCategory.create({
						data: {
							name: faker.string.uuid(),
						},
					}),
				);
				const repository = buildCategories({ db: prisma });

				const result = await repository.findMany(makeMockContext());

				expect(result).toEqual(
					Result.success({
						categories: expect.arrayContaining([expected]),
						total: expect.any(Number),
					}),
				);
			});
		});

		describe("#delete", () => {
			it("deletes a document category", async () => {
				const expected = new DocumentCategory(
					await prisma.documentCategory.create({
						data: {
							name: faker.string.uuid(),
						},
					}),
				);
				const repository = buildCategories({ db: prisma });

				const result = await repository.delete(makeMockContext(), {
					id: expected.id,
				});

				expect(result).toEqual(
					Result.success({
						category: expected,
					}),
				);
			});

			it("returns NotFoundError if a document with the ID does not exist", async () => {
				const repository = buildCategories({ db: prisma });

				const result = await repository.delete(makeMockContext(), {
					id: faker.string.uuid(),
				});

				expect(result).toEqual(Result.error(expect.any(NotFoundError)));
			});

			it("returns NotFoundError the ID is not a UUID", async () => {
				const repository = buildCategories({ db: prisma });

				const result = await repository.delete(makeMockContext(), {
					id: faker.word.adjective(),
				});

				expect(result).toEqual(Result.error(expect.any(NotFoundError)));
			});
		});
	});
});

import assert from "node:assert";
import { faker } from "@faker-js/faker";
import { makeTestServices } from "~/__tests__/dependencies-factory.js";
import { NotFoundError } from "~/domain/errors.js";
import { makeMockContext } from "~/lib/context.js";
import prisma from "~/lib/prisma.js";
import { Result } from "~/lib/result.js";
import { buildDocuments } from "./documents.js";

describe("Documents repository", () => {
	const documents = buildDocuments({ db: prisma });
	describe("#create", () => {
		it("creates a document", async () => {
			const { user, file } = await makeDependencies();
			const fields = {
				name: faker.word.adjective(),
				fileId: file.id,
				description: faker.lorem.sentence(),
			};
			const result = await documents.create(makeMockContext(user), fields);

			expect(result).toEqual(
				Result.success({
					document: expect.objectContaining({
						id: expect.any(String),
						...fields,
					}),
				}),
			);
		});

		it("creates a document with categories", async () => {
			const { user, file } = await makeDependencies();
			const categoryName1 = faker.string.uuid();
			const categoryName2 = faker.string.uuid();
			const result = await documents.create(makeMockContext(user), {
				name: faker.word.adjective(),
				fileId: file.id,
				categories: [
					{
						name: categoryName1,
					},
					{
						name: categoryName2,
					},
				],
			});

			expect(result).toEqual(
				Result.success({
					document: expect.objectContaining({
						id: expect.any(String),
						fileId: file.id,
						categories: expect.arrayContaining([
							expect.objectContaining({
								name: categoryName1,
								id: expect.any(String),
							}),
							expect.objectContaining({
								name: categoryName2,
								id: expect.any(String),
							}),
						]),
					}),
				}),
			);
		});
	});

	describe("#findMany", () => {
		it("returns all documents and the total count", async () => {
			/**
			 * Create three documents
			 */
			const document1 = await makeDocument();
			const document2 = await makeDocument();
			const document3 = await makeDocument();

			const result = await documents.findMany(makeMockContext());

			if (!result.ok) throw result.error;

			const { documents: actual, total } = result.data;
			expect(total).toBeGreaterThanOrEqual(3);
			expect(actual).toEqual(
				expect.arrayContaining([document1, document2, document3]),
			);
		});

		it("returns all documents with a matching category and the total count", async () => {
			/**
			 * Create three documents
			 */
			const categories = [{ name: faker.string.uuid() }];
			const document1 = await makeDocument({ categories });
			const document2 = await makeDocument({ categories });
			const document3 = await makeDocument();
			const category = document1.categories[0];
			assert(category, "Expected document to have a category");

			const result = await documents.findMany(makeMockContext(), {
				categories: [category],
			});

			if (!result.ok) throw result.error;

			const { documents: actual, total } = result.data;
			expect(total).toBe(2);
			expect(actual).toEqual(expect.arrayContaining([document1, document2]));
			expect(actual).not.toEqual(expect.arrayContaining([document3]));
		});
	});

	describe("#update", () => {
		it("updates a document", async () => {
			const document = await makeDocument();
			const newName = faker.word.adjective();

			const result = await documents.update(makeMockContext(), {
				id: document.id,
				name: newName,
			});

			expect(result).toEqual(
				Result.success({
					document: expect.objectContaining({ name: newName }),
				}),
			);
		});

		it("disconnects any categories that are not in the new list", async () => {
			const category1 = { name: faker.string.uuid() };
			const category2 = { name: faker.string.uuid() };
			const category3 = { name: faker.string.uuid() };
			const document = await makeDocument({
				categories: [category1, category2],
			});

			const newCategories = [category1, category3];

			const result = await documents.update(makeMockContext(), {
				id: document.id,
				categories: newCategories,
			});
			if (!result.ok) throw result.error;

			const updatedDocument = result.data.document;
			expect(updatedDocument.categories).toEqual(
				expect.arrayContaining([expect.objectContaining(category1)]),
			);
			expect(updatedDocument.categories).toEqual(
				expect.arrayContaining([expect.objectContaining(category3)]),
			);
			expect(updatedDocument.categories).not.toEqual(
				expect.arrayContaining([expect.objectContaining(category2)]),
			);
		});

		it("leaves categories unaffected if undefined", async () => {
			const category1 = { name: faker.string.uuid() };
			const category2 = { name: faker.string.uuid() };
			const document = await makeDocument({
				categories: [category1, category2],
			});

			const result = await documents.update(makeMockContext(), {
				id: document.id,
				categories: undefined,
			});
			if (!result.ok) throw result.error;

			const updatedDocument = result.data.document;
			expect(updatedDocument.categories).toEqual(
				expect.arrayContaining([expect.objectContaining(category1)]),
			);
			expect(updatedDocument.categories).toEqual(
				expect.arrayContaining([expect.objectContaining(category2)]),
			);
		});

		it("returns NotFoundError if the document does not exist", async () => {
			const result = await documents.update(makeMockContext(), {
				id: faker.string.uuid(),
			});
			expect(result).toEqual(Result.error(expect.any(NotFoundError)));
		});

		it("returns NotFoundError if updating categories and the document does not exist", async () => {
			const result = await documents.update(makeMockContext(), {
				id: faker.string.uuid(),
				categories: [],
			});
			expect(result).toEqual(Result.error(expect.any(NotFoundError)));
		});

		it("returns NotFoundError if updating categories and ID is not a uuid", async () => {
			const result = await documents.update(makeMockContext(), {
				id: "not-a-uuid",
				categories: [],
			});
			expect(result).toEqual(Result.error(expect.any(NotFoundError)));
		});
	});

	describe("#delete", () => {
		it("returns NotFoundError if the document does not exist", async () => {
			const result = await documents.delete(makeMockContext(), {
				id: faker.string.uuid(),
			});
			expect(result).toEqual(Result.error(expect.any(NotFoundError)));
		});

		it("returns NotFoundError id is not a UUID", async () => {
			const result = await documents.delete(makeMockContext(), {
				id: "not-a-uuid",
			});
			expect(result).toEqual(Result.error(expect.any(NotFoundError)));
		});

		it("deletes the document", async () => {
			const document = await makeDocument();

			const result = await documents.delete(makeMockContext(), {
				id: document.id,
			});
			const findResult = await documents.findMany(makeMockContext());
			if (!findResult.ok) throw findResult.error;
			const { documents: actualDocuments } = findResult.data;

			expect(actualDocuments).not.toEqual(expect.arrayContaining([document]));
			expect(result).toEqual(
				Result.success({
					document: expect.objectContaining(document),
				}),
			);
		});
	});

	describe("#find", () => {
		it("returns the matching document", async () => {
			const expected = await makeDocument();

			const result = await documents.find(makeMockContext(), {
				id: expected.id,
			});

			expect(result).toEqual(Result.success({ document: expected }));
		});

		it("returns NotFoundError if no matching document exists", async () => {
			const result = await documents.find(makeMockContext(), {
				id: faker.string.uuid(),
			});

			expect(result).toEqual(Result.error(expect.any(NotFoundError)));
		});
	});

	async function makeDocument(params?: { categories?: { name: string }[] }) {
		const { user, file } = await makeDependencies();
		const result = await documents.create(makeMockContext(user), {
			name: faker.string.uuid(),
			fileId: file.id,
			categories: params?.categories ?? [
				{
					name: faker.string.uuid(),
				},
			],
		});
		if (!result.ok) throw result.error;
		return result.data.document;
	}

	async function makeDependencies() {
		const { files, users } = makeTestServices();
		const user = await users.create({
			email: faker.internet.email({ firstName: faker.string.uuid() }),
			feideId: faker.string.uuid(),
			firstName: faker.person.firstName(),
			lastName: faker.person.lastName(),
			username: faker.string.uuid(),
		});
		const createFileUploadUrlResult = await files.createFileUploadUrl(
			makeMockContext(user),
			{ extension: "pdf" },
		);
		if (!createFileUploadUrlResult.ok) throw createFileUploadUrlResult.error;
		return { file: createFileUploadUrlResult.data.file, user };
	}
});

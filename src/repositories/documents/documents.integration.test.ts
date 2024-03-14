import { faker } from "@faker-js/faker";
import { makeTestServices } from "~/__tests__/dependencies-factory.js";
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
	});

	async function makeDocument() {
		const { user, file } = await makeDependencies();
		const result = await documents.create(makeMockContext(user), {
			name: faker.word.adjective(),
			fileId: file.id,
			categories: [
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

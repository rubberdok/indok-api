import { faker } from "@faker-js/faker";
import { makeTestServices } from "~/__tests__/dependencies-factory.js";
import { makeMockContext } from "~/lib/context.js";
import prisma from "~/lib/prisma.js";
import { Result } from "~/lib/result.js";
import { buildDocuments } from "./documents.js";

describe("Documents repository", () => {
	describe("#create", () => {
		const documents = buildDocuments({ db: prisma });

		it("creates a document", async () => {
			const { user, file } = await makeDependencies();
			const result = await documents.create(makeMockContext(user), {
				name: faker.word.adjective(),
				fileId: file.id,
			});

			expect(result).toEqual(
				Result.success({
					document: expect.objectContaining({
						id: expect.any(String),
						fileId: file.id,
					}),
				}),
			);
		});
	});
});

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

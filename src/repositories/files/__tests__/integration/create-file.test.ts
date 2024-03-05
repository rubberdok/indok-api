import { faker } from "@faker-js/faker";
import { makeUser } from "~/__tests__/dependencies-factory.js";
import prisma from "~/lib/prisma.js";
import { FileRepository } from "../../repository.js";

describe("FileRepository", () => {
	describe("#createFile", () => {
		it("creates a file with the given id and userId", async () => {
			const user = await makeUser();
			const fileRepository = FileRepository({ db: prisma });
			const fileId = faker.string.uuid();

			const createFileResult = await fileRepository.createFile({
				id: fileId,
				userId: user.id,
			});

			expect(createFileResult).toEqual({
				ok: true,
				data: {
					file: expect.objectContaining({
						id: fileId,
						userId: user.id,
					}),
				},
			});
		});
	});
});

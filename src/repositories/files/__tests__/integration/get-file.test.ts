import { faker } from "@faker-js/faker";
import { makeUser } from "~/__tests__/dependencies-factory.js";
import { NotFoundError } from "~/domain/errors.js";
import prisma from "~/lib/prisma.js";
import { FileRepository } from "../../repository.js";

describe("FileRepository", () => {
	describe("#getFile", () => {
		it("returns an existing file", async () => {
			const user = await makeUser();
			const fileRepository = FileRepository({ db: prisma });
			const fileId = faker.string.uuid();
			await fileRepository.createFile({
				id: fileId,
				userId: user.id,
			});

			const getFileResult = await fileRepository.getFile({ id: fileId });
			expect(getFileResult).toEqual({
				ok: true,
				data: {
					file: expect.objectContaining({ id: fileId, userId: user.id }),
				},
			});
		});

		it("returns NotFoundError if the file does not exist", async () => {
			const fileRepository = FileRepository({ db: prisma });
			const fileId = faker.string.uuid();

			const getFileResult = await fileRepository.getFile({ id: fileId });
			expect(getFileResult).toEqual({
				ok: false,
				error: expect.any(NotFoundError),
			});
		});
	});
});

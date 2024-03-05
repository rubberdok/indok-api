import { faker } from "@faker-js/faker";
import { mockDeep } from "jest-mock-extended";
import { InternalServerError } from "~/domain/errors.js";
import { RemoteFile } from "~/domain/files.js";
import { makeMockContext } from "~/lib/context.js";
import {
	type BlobStorageAdapter,
	type FileRepository,
	FileService,
} from "../../service.js";

describe("FileService", () => {
	describe("#getFile", () => {
		it("returns an error if the repository fails to get file", async () => {
			const { files, fileRepository } = makeDependencies();
			fileRepository.getFile.mockResolvedValue({
				ok: false,
				error: new InternalServerError(""),
			});
			const result = await files.getFile(makeMockContext({}), {
				id: faker.string.uuid(),
			});
			expect(result).toEqual({
				ok: false,
				error: expect.any(InternalServerError),
			});
		});

		it("returns the file", async () => {
			const { files, fileRepository } = makeDependencies();
			fileRepository.getFile.mockResolvedValue({
				ok: true,
				data: {
					file: new RemoteFile({
						id: faker.string.uuid(),
						userId: faker.string.uuid(),
						name: faker.system.fileName(),
					}),
				},
			});
			const result = await files.getFile(makeMockContext({}), {
				id: faker.string.uuid(),
			});
			expect(result).toEqual({
				ok: true,
				data: {
					file: expect.any(RemoteFile),
				},
			});
		});
	});
});

function makeDependencies() {
	const fileRepository = mockDeep<FileRepository>();
	const blobStorageAdapter = mockDeep<BlobStorageAdapter>();
	const files = FileService({ fileRepository, blobStorageAdapter });

	return { fileRepository, blobStorageAdapter, files };
}

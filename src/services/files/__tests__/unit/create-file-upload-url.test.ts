import { faker } from "@faker-js/faker";
import { mock, mockDeep } from "jest-mock-extended";
import {
	DownstreamServiceError,
	InternalServerError,
	InvalidArgumentError,
	UnauthorizedError,
} from "~/domain/errors.js";
import { type FileType, RemoteFile } from "~/domain/files.js";
import { makeMockContext } from "~/lib/context.js";
import {
	type BlobStorageAdapter,
	type FileRepository,
	FileService,
} from "../../service.js";

describe("FileService", () => {
	describe("#createFileUploadUrl", () => {
		it("returns UnauthorizedError if the user is not logged in", async () => {
			const { files } = makeDependencies();

			const result = await files.createFileUploadUrl(makeMockContext(null), {
				extension: "txt",
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(UnauthorizedError),
			});
		});

		it("returns InternalServerError if repository fails to create file", async () => {
			const { files, fileRepository } = makeDependencies();

			fileRepository.createFile.mockResolvedValue({
				ok: false,
				error: new InternalServerError("Database is down"),
			});

			const result = await files.createFileUploadUrl(makeMockContext({}), {
				extension: "txt",
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(InternalServerError),
			});
		});

		it("returns DownstreamServiceError if adapter fails with DownstreamServiceError", async () => {
			const { files, fileRepository, blobStorageAdapter } = makeDependencies();

			fileRepository.createFile.mockResolvedValue({
				ok: true,
				data: {
					file: mock<FileType>({ id: faker.string.uuid() }),
				},
			});
			blobStorageAdapter.createSasBlobUrl.mockResolvedValue({
				ok: false,
				error: new DownstreamServiceError("Blob storage is down"),
			});

			const result = await files.createFileUploadUrl(makeMockContext({}), {
				extension: "txt",
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(DownstreamServiceError),
			});
		});

		it("returns InternalServerError if adapter fails with InternalServerError", async () => {
			const { files, fileRepository, blobStorageAdapter } = makeDependencies();

			fileRepository.createFile.mockResolvedValue({
				ok: true,
				data: {
					file: mock<FileType>({ id: faker.string.uuid() }),
				},
			});
			blobStorageAdapter.createSasBlobUrl.mockResolvedValue({
				ok: false,
				error: new InternalServerError("Blob storage is down"),
			});

			const result = await files.createFileUploadUrl(makeMockContext({}), {
				extension: "txt",
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(InternalServerError),
			});
		});

		it("returns InvalidArgumentError if adapter fails with InvalidArgumentError", async () => {
			const { files, fileRepository, blobStorageAdapter } = makeDependencies();

			fileRepository.createFile.mockResolvedValue({
				ok: true,
				data: {
					file: mock<FileType>({ id: faker.string.uuid() }),
				},
			});
			blobStorageAdapter.createSasBlobUrl.mockResolvedValue({
				ok: false,
				error: new InvalidArgumentError("Blob storage is down"),
			});

			const result = await files.createFileUploadUrl(makeMockContext({}), {
				extension: "txt",
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(InvalidArgumentError),
			});
		});

		it("returns file upload url and file id", async () => {
			const { files, fileRepository, blobStorageAdapter } = makeDependencies();

			fileRepository.createFile.mockResolvedValue({
				ok: true,
				data: {
					file: new RemoteFile({
						id: faker.string.uuid(),
						userId: faker.string.uuid(),
						name: faker.system.fileName(),
					}),
				},
			});
			blobStorageAdapter.createSasBlobUrl.mockResolvedValue({
				ok: true,
				data: {
					url: faker.internet.url(),
				},
			});

			const result = await files.createFileUploadUrl(makeMockContext({}), {
				extension: "txt",
			});

			expect(result).toEqual({
				ok: true,
				data: {
					url: expect.any(String),
					file: expect.any(RemoteFile),
				},
			});
		});

		it("returns InvalidArgumentError if the file type is not permitted", async () => {
			const { files, fileRepository, blobStorageAdapter } = makeDependencies();

			fileRepository.createFile.mockResolvedValue({
				ok: true,
				data: {
					file: new RemoteFile({
						id: faker.string.uuid(),
						userId: faker.string.uuid(),
						name: faker.system.fileName(),
					}),
				},
			});
			blobStorageAdapter.createSasBlobUrl.mockResolvedValue({
				ok: true,
				data: {
					url: faker.internet.url(),
				},
			});

			const result = await files.createFileUploadUrl(makeMockContext({}), {
				extension: "exe",
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(InvalidArgumentError),
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

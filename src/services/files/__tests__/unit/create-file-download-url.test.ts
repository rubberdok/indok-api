import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import {
	DownstreamServiceError,
	InternalServerError,
	InvalidArgumentError,
	NotFoundError,
} from "~/domain/errors.js";
import type { FileType } from "~/domain/files.js";
import { RemoteFile } from "~/domain/files.js";
import { makeMockContext } from "~/lib/context.js";
import { makeDependencies } from "./dependencies.js";

describe("FileService", () => {
	describe("#createFileDownloadUrl", () => {
		it("returns InternalServerError if repository fails unexpectedly to get file", async () => {
			const { files, fileRepository } = makeDependencies();

			fileRepository.getFile.mockResolvedValue({
				ok: false,
				error: new InternalServerError("Database is down"),
			});

			const result = await files.createFileDownloadUrl(makeMockContext({}), {
				id: faker.string.uuid(),
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(InternalServerError),
			});
		});

		it("returns NotFoundError if the file does not exist in the repository", async () => {
			const { files, fileRepository } = makeDependencies();

			fileRepository.getFile.mockResolvedValue({
				ok: false,
				error: new NotFoundError(""),
			});

			const result = await files.createFileDownloadUrl(makeMockContext({}), {
				id: faker.string.uuid(),
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(NotFoundError),
			});
		});

		it("returns DownstreamServiceError if adapter fails with DownstreamServiceError", async () => {
			const { files, fileRepository, blobStorageAdapter } = makeDependencies();

			fileRepository.getFile.mockResolvedValue({
				ok: true,
				data: {
					file: mock<FileType>({ id: faker.string.uuid() }),
				},
			});

			blobStorageAdapter.createSasBlobUrl.mockResolvedValue({
				ok: false,
				error: new DownstreamServiceError("Blob storage is down"),
			});

			const result = await files.createFileDownloadUrl(makeMockContext({}), {
				id: faker.string.uuid(),
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(DownstreamServiceError),
			});
		});

		it("returns InternalServerError if adapter fails with InternalServerError", async () => {
			const { files, fileRepository, blobStorageAdapter } = makeDependencies();

			fileRepository.getFile.mockResolvedValue({
				ok: true,
				data: {
					file: mock<FileType>({ id: faker.string.uuid() }),
				},
			});
			blobStorageAdapter.createSasBlobUrl.mockResolvedValue({
				ok: false,
				error: new InternalServerError("Blob storage is down"),
			});

			const result = await files.createFileDownloadUrl(makeMockContext({}), {
				id: faker.string.uuid(),
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(InternalServerError),
			});
		});

		it("returns InvalidArgumentError if adapter fails with InvalidArgumentError", async () => {
			const { files, fileRepository, blobStorageAdapter } = makeDependencies();

			fileRepository.getFile.mockResolvedValue({
				ok: true,
				data: {
					file: mock<FileType>({ id: faker.string.uuid() }),
				},
			});
			blobStorageAdapter.createSasBlobUrl.mockResolvedValue({
				ok: false,
				error: new InvalidArgumentError("Blob storage is down"),
			});

			const result = await files.createFileDownloadUrl(makeMockContext({}), {
				id: faker.string.uuid(),
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(InvalidArgumentError),
			});
		});

		it("returns file download url and file", async () => {
			const { files, fileRepository, blobStorageAdapter } = makeDependencies();

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
			blobStorageAdapter.createSasBlobUrl.mockResolvedValue({
				ok: true,
				data: {
					url: faker.internet.url(),
				},
			});

			const result = await files.createFileDownloadUrl(makeMockContext({}), {
				id: faker.string.uuid(),
			});

			expect(result).toEqual({
				ok: true,
				data: {
					url: expect.any(String),
					file: expect.any(RemoteFile),
				},
			});
		});
	});
});

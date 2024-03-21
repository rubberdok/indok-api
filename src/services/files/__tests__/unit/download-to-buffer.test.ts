import { faker } from "@faker-js/faker";
import {
	DownstreamServiceError,
	InternalServerError,
} from "~/domain/errors.js";
import { RemoteFile } from "~/domain/files.js";
import { makeMockContext } from "~/lib/context.js";
import { Result } from "~/lib/result.js";
import { makeDependencies } from "./dependencies.js";

describe("File service", () => {
	describe("#downloadToBuffer", () => {
		it("returns error if getFile fails", async () => {
			const { files, fileRepository } = makeDependencies();
			fileRepository.getFile.mockResolvedValue({
				ok: false,
				error: new InternalServerError(""),
			});

			const result = await files.downloadFileToBuffer(makeMockContext({}), {
				id: faker.string.uuid(),
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(InternalServerError),
			});
		});

		it("returns error if downloadToBuffer fails", async () => {
			const { files, fileRepository, blobStorageAdapter } = makeDependencies();
			fileRepository.getFile.mockResolvedValue(
				Result.success({
					file: new RemoteFile({
						id: faker.string.uuid(),
						userId: faker.string.uuid(),
						name: faker.system.fileName(),
					}),
				}),
			);
			blobStorageAdapter.downloadToBuffer.mockResolvedValue(
				Result.error(new DownstreamServiceError("")),
			);

			const result = await files.downloadFileToBuffer(makeMockContext({}), {
				id: faker.string.uuid(),
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(DownstreamServiceError),
			});
		});

		it("returns buffer", async () => {
			const { files, fileRepository, blobStorageAdapter } = makeDependencies();
			const buffer = Buffer.from("test");
			fileRepository.getFile.mockResolvedValue(
				Result.success({
					file: new RemoteFile({
						id: faker.string.uuid(),
						userId: faker.string.uuid(),
						name: faker.system.fileName(),
					}),
				}),
			);
			blobStorageAdapter.downloadToBuffer.mockResolvedValue(
				Result.success({ buffer }),
			);

			const result = await files.downloadFileToBuffer(makeMockContext({}), {
				id: faker.string.uuid(),
			});

			expect(result).toEqual(Result.success({ buffer: expect.any(Buffer) }));
		});
	});
});

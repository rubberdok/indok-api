import { randomUUID } from "node:crypto";
import {
	DownstreamServiceError,
	InternalServerError,
	InvalidArgumentError,
	type NotFoundError,
	UnauthorizedError,
} from "~/domain/errors.js";
import type { FileType, RemoteFile } from "~/domain/files.js";
import type { Context } from "~/lib/context.js";
import type { ResultAsync } from "~/lib/result.js";
import type { IFileService } from "~/lib/server.js";

interface FileRepository {
	createFile(params: { id: string; userId: string; name: string }): ResultAsync<
		{ file: FileType },
		InternalServerError
	>;
	getFile(params: { id: string }): ResultAsync<
		{ file: FileType },
		NotFoundError | InternalServerError
	>;
}

interface BlobStorageAdapter {
	createSasBlobUrl(
		ctx: Context,
		params: { name: string; action: "UPLOAD" | "DOWNLOAD" | "DELETE" },
	): ResultAsync<
		{ url: string },
		InternalServerError | DownstreamServiceError | InvalidArgumentError
	>;
}

type Dependencies = {
	fileRepository: FileRepository;
	blobStorageAdapter: BlobStorageAdapter;
};

const FILE_TYPE_ALLOWED_EXTENSIONS = [
	"jpg",
	"jpeg",
	"png",
	"gif",
	"pdf",
	"docx",
	"txt",
];

function FileService({
	fileRepository,
	blobStorageAdapter,
}: Dependencies): IFileService {
	return {
		async createFileUploadUrl(ctx, { extension }) {
			if (!ctx.user) {
				return {
					ok: false,
					error: new UnauthorizedError(
						"You must be logged in to upload a file.",
					),
				};
			}

			ctx.log.info({ extension }, "validating file extension");
			if (!FILE_TYPE_ALLOWED_EXTENSIONS.includes(extension)) {
				return {
					ok: false,
					error: new InvalidArgumentError(
						`File type not allowed. Allowed extensions: ${FILE_TYPE_ALLOWED_EXTENSIONS.join(
							", ",
						)}`,
					),
				};
			}

			const id = randomUUID();
			const fileName = `${id}.${extension}`;
			ctx.log.info({ fileName }, "creating file");
			const createFileResult = await fileRepository.createFile({
				id,
				userId: ctx.user.id,
				name: fileName,
			});
			if (!createFileResult.ok) {
				return createFileResult;
			}

			ctx.log.info({ fileName }, "creating blob upload url");
			const createBlobUploadUrlResult =
				await blobStorageAdapter.createSasBlobUrl(ctx, {
					name: fileName,
					action: "UPLOAD",
				});

			if (!createBlobUploadUrlResult.ok) {
				switch (createBlobUploadUrlResult.error.name) {
					case "DownstreamServiceError":
						return {
							ok: false,
							error: new DownstreamServiceError(
								"blob storage adapter failed",
								createBlobUploadUrlResult.error,
							),
						};
					case "InternalServerError":
						return {
							ok: false,
							error: new InternalServerError(
								"blob storage adapter failed",
								createBlobUploadUrlResult.error,
							),
						};
					case "InvalidArgumentError": {
						return {
							ok: false,
							error: new InvalidArgumentError(
								"blob storage adapter failed",
								createBlobUploadUrlResult.error,
							),
						};
					}
				}
			}

			return {
				ok: true,
				data: {
					url: createBlobUploadUrlResult.data.url,
					file: createFileResult.data.file,
				},
			};
		},

		async createFileDownloadUrl(
			ctx: Context,
			params: { id: string },
		): ResultAsync<
			{ url: string; file: RemoteFile },
			| InternalServerError
			| NotFoundError
			| DownstreamServiceError
			| InvalidArgumentError
		> {
			const getFileResult = await fileRepository.getFile({ id: params.id });
			if (!getFileResult.ok) {
				return getFileResult;
			}
			const { file } = getFileResult.data;

			const createBlobDownloadUrlResult =
				await blobStorageAdapter.createSasBlobUrl(ctx, {
					name: file.name,
					action: "DOWNLOAD",
				});
			if (!createBlobDownloadUrlResult.ok) {
				switch (createBlobDownloadUrlResult.error.name) {
					case "DownstreamServiceError":
						return {
							ok: false,
							error: new DownstreamServiceError(
								"blob storage adapter failed",
								createBlobDownloadUrlResult.error,
							),
						};
					case "InternalServerError":
						return {
							ok: false,
							error: new InternalServerError(
								"blob storage adapter failed",
								createBlobDownloadUrlResult.error,
							),
						};
					case "InvalidArgumentError": {
						return {
							ok: false,
							error: new InvalidArgumentError(
								"blob storage adapter failed",
								createBlobDownloadUrlResult.error,
							),
						};
					}
				}
			}

			return {
				ok: true,
				data: {
					url: createBlobDownloadUrlResult.data.url,
					file,
				},
			};
		},

		async getFile(_ctx, { id }) {
			const getFileResult = await fileRepository.getFile({ id });
			if (!getFileResult.ok) {
				return getFileResult;
			}
			return {
				ok: true,
				data: {
					file: getFileResult.data.file,
				},
			};
		},
	};
}

export { FileService };
export type { FileRepository, BlobStorageAdapter };

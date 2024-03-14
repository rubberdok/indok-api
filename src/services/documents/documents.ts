import type { FeaturePermission } from "@prisma/client";
import { z } from "zod";
import type { Document, DocumentService } from "~/domain/documents.js";
import {
	DownstreamServiceError,
	InternalServerError,
	type InvalidArgumentError,
	InvalidArgumentErrorV2,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
import type { FileType } from "~/domain/files.js";
import type { Context } from "~/lib/context.js";
import { Result, type ResultAsync } from "~/lib/result.js";

type DocumentRepositoryType = {
	documents: {
		create(
			ctx: Context,
			data: Pick<Document, "fileId" | "name">,
		): ResultAsync<{ document: Document }, InternalServerError>;
		update(
			ctx: Context,
			data: Document,
		): ResultAsync<
			{ document: Document },
			InvalidArgumentErrorV2 | InternalServerError
		>;
		delete(
			ctx: Context,
			data: Pick<Document, "id">,
		): ResultAsync<
			{ document: Document },
			InvalidArgumentErrorV2 | InternalServerError
		>;
		findMany(
			ctx: Context,
		): ResultAsync<
			{ documents: Document[]; total: number },
			InternalServerError
		>;
	};
};

type PermissionService = {
	hasFeaturePermission(
		ctx: Context,
		data: { featurePermission: FeaturePermission },
	): Promise<boolean>;
};

type FileService = {
	createFileUploadUrl(
		ctx: Context,
		params: { extension: string },
	): ResultAsync<
		{ file: FileType; url: string },
		| DownstreamServiceError
		| InternalServerError
		| UnauthorizedError
		| InvalidArgumentError
	>;
};

type DocumentDependencies = {
	files: FileService;
	repository: DocumentRepositoryType;
	permissions: PermissionService;
};

function buildDocuments({
	repository,
	files,
	permissions,
}: DocumentDependencies): DocumentService["documents"] {
	return {
		async create(ctx, data) {
			if (!ctx.user)
				return Result.error(
					new UnauthorizedError(
						"You must be logged in to perform this action.",
					),
				);
			const hasPermission = await permissions.hasFeaturePermission(ctx, {
				featurePermission: "ARCHIVE_WRITE_DOCUMENTS",
			});
			if (!hasPermission)
				return Result.error(
					new PermissionDeniedError(
						"You do not have the permission required to perform this action.",
					),
				);

			const schema = z.object({
				name: z.string().min(1),
			});
			const validationResult = schema.safeParse(data);
			if (!validationResult.success)
				return Result.error(
					new InvalidArgumentErrorV2("Invalid argument error", {
						reason: validationResult.error.flatten().fieldErrors,
						cause: validationResult.error,
					}),
				);

			const createFileResult = await files.createFileUploadUrl(ctx, {
				extension: data.fileExtension,
			});
			if (!createFileResult.ok) {
				switch (createFileResult.error.name) {
					case "DownstreamServiceError":
						ctx.log.error(
							createFileResult.error,
							"Error creating file upload url",
						);
						return Result.error(
							new DownstreamServiceError(
								"Error creating file upload url",
								createFileResult.error,
							),
						);
					case "InternalServerError":
						return Result.error(
							new InternalServerError(
								"Unexpected error when creating file",
								createFileResult.error,
							),
						);
					case "InvalidArgumentError":
						return Result.error(
							new InvalidArgumentErrorV2(
								createFileResult.error.message,
								createFileResult.error,
							),
						);
					case "UnauthorizedError":
						return Result.error(createFileResult.error);
				}
			}

			const { file, url } = createFileResult.data;

			const createDocumentResult = await repository.documents.create(ctx, {
				fileId: file.id,
				name: data.name,
			});

			if (!createDocumentResult.ok)
				return Result.error(
					new InternalServerError(
						"Unexpected error when creating document",
						createDocumentResult.error,
					),
				);

			return Result.success({
				document: createDocumentResult.data.document,
				uploadUrl: url,
			});
		},
		async update(ctx, _data) {
			if (!ctx.user)
				return Result.error(
					new UnauthorizedError(
						"You must be logged in to perform this action.",
					),
				);
			const hasPermission = await permissions.hasFeaturePermission(ctx, {
				featurePermission: "ARCHIVE_WRITE_DOCUMENTS",
			});
			if (!hasPermission)
				return Result.error(
					new PermissionDeniedError(
						"You do not have the permission required to perform this action.",
					),
				);
			return Result.error(new InternalServerError("Not yet implemented"));
		},
		async delete(ctx, _data) {
			if (!ctx.user)
				return Result.error(
					new UnauthorizedError(
						"You must be logged in to perform this action.",
					),
				);
			const hasPermission = await permissions.hasFeaturePermission(ctx, {
				featurePermission: "ARCHIVE_WRITE_DOCUMENTS",
			});
			if (!hasPermission)
				return Result.error(
					new PermissionDeniedError(
						"You do not have the permission required to perform this action.",
					),
				);
			return Result.error(new InternalServerError("Not yet implemented"));
		},
		async findMany(ctx) {
			if (!ctx.user)
				return Result.error(
					new UnauthorizedError(
						"You must be logged in to perform this action.",
					),
				);
			const hasPermission = await permissions.hasFeaturePermission(ctx, {
				featurePermission: "ARCHIVE_VIEW_DOCUMENTS",
			});
			if (!hasPermission)
				return Result.error(
					new PermissionDeniedError(
						"You do not have the permission required to perform this action.",
					),
				);
			return await repository.documents.findMany(ctx);
		},
	};
}

export { buildDocuments };
export type {
	DocumentDependencies,
	DocumentRepositoryType,
	FileService,
	PermissionService,
};

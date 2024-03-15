import { z } from "zod";
import type {
	Document,
	DocumentCategory,
	DocumentService,
} from "~/domain/documents.js";
import {
	DownstreamServiceError,
	InternalServerError,
	type InvalidArgumentError,
	InvalidArgumentErrorV2,
	type NotFoundError,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
import type { FileType } from "~/domain/files.js";
import type { FeaturePermissionType } from "~/domain/organizations.js";
import type { Context } from "~/lib/context.js";
import { Result, type ResultAsync } from "~/lib/result.js";

type DocumentRepositoryType = {
	documents: {
		create(
			ctx: Context,
			data: Pick<Document, "fileId" | "name"> &
				Partial<Pick<Document, "description">> &
				Partial<{
					categories: Pick<DocumentCategory, "name">[];
				}>,
		): ResultAsync<{ document: Document }, InternalServerError>;
		update(
			ctx: Context,
			data: Pick<Document, "id"> &
				Partial<Pick<Document, "description" | "name">> &
				Partial<{
					categories: Pick<DocumentCategory, "name">[];
				}>,
		): ResultAsync<{ document: Document }, NotFoundError | InternalServerError>;
		delete(
			ctx: Context,
			data: Pick<Document, "id">,
		): ResultAsync<{ document: Document }, NotFoundError | InternalServerError>;
		findMany(
			ctx: Context,
			by?: { categories?: { id: string }[] },
		): ResultAsync<
			{ documents: Document[]; total: number },
			InternalServerError
		>;
	};
};

type PermissionService = {
	hasFeaturePermission(
		ctx: Context,
		data: { featurePermission: FeaturePermissionType },
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
		async update(ctx, data) {
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
				id: z.string().uuid(),
				name: z
					.string()
					.min(1)
					.nullish()
					.transform((val) => val ?? undefined),
				description: z
					.string()
					.nullish()
					.transform((val) => val ?? undefined),
				categories: z
					.array(z.object({ name: z.string().min(1) }))
					.nullish()
					.transform((val) => val ?? undefined),
			});
			const validationResult = schema.safeParse(data);
			if (!validationResult.success) {
				return Result.error(
					new InvalidArgumentErrorV2("Invalid argument error", {
						reason: validationResult.error.flatten().fieldErrors,
						cause: validationResult.error,
					}),
				);
			}
			const updateDocumentResult = await repository.documents.update(
				ctx,
				validationResult.data,
			);

			if (!updateDocumentResult.ok) {
				switch (updateDocumentResult.error.name) {
					case "NotFoundError":
						return Result.error(updateDocumentResult.error);
					case "InternalServerError":
						return Result.error(
							new InternalServerError(
								"Unexpected error when updating document",
								updateDocumentResult.error,
							),
						);
				}
			}

			return Result.success({
				document: updateDocumentResult.data.document,
			});
		},

		async delete(ctx, data) {
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

			const deleteResult = await repository.documents.delete(ctx, data);
			if (!deleteResult.ok) {
				switch (deleteResult.error.name) {
					case "NotFoundError":
						return Result.error(deleteResult.error);
					case "InternalServerError":
						return Result.error(
							new InternalServerError(
								"Unexpected error when deleting document",
								deleteResult.error,
							),
						);
				}
			}
			return Result.success({ document: deleteResult.data.document });
		},

		async findMany(ctx, by) {
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
			return await repository.documents.findMany(ctx, {
				categories: by?.categories ?? undefined,
			});
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

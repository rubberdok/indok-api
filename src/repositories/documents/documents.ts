import type { Prisma, PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { Document, type DocumentCategory } from "~/domain/documents.js";
import { InternalServerError, NotFoundError } from "~/domain/errors.js";
import { prismaKnownErrorCodes } from "~/lib/prisma.js";
import { Result } from "~/lib/result.js";
import type { DocumentRepositoryType } from "~/services/documents/documents.js";

type DocumentDependencies = {
	db: PrismaClient;
};

function buildDocuments({
	db,
}: DocumentDependencies): DocumentRepositoryType["documents"] {
	return {
		async create(ctx, data) {
			ctx.log.info({ data }, "creating document");
			try {
				const document = await db.document.create({
					include: {
						categories: true,
					},
					data: {
						name: data.name,
						fileId: data.fileId,
						description: data.description,
						categories: {
							connectOrCreate: data.categories?.map((category) => ({
								create: {
									name: category.name,
								},
								where: {
									name: category.name,
								},
							})),
						},
					},
				});
				return Result.success({ document: new Document(document) });
			} catch (err) {
				return Result.error(
					new InternalServerError("failed to create document", err),
				);
			}
		},
		async delete(ctx, { id }) {
			ctx.log.info({ documentId: id }, "deleting document");
			try {
				const document = await db.document.delete({
					include: {
						categories: true,
					},
					where: {
						id,
					},
				});
				return Result.success({ document: new Document(document) });
			} catch (err) {
				if (err instanceof PrismaClientKnownRequestError) {
					if (
						err.code === prismaKnownErrorCodes.ERR_NOT_FOUND ||
						err.code === prismaKnownErrorCodes.ERR_INCONSISTENT_COLUMN_DATA
					) {
						return Result.error(new NotFoundError("Document does not exist"));
					}
				}
				return Result.error(
					new InternalServerError("Failed to delete document", err),
				);
			}
		},
		async update(ctx, data) {
			ctx.log.info({ documentId: data.id }, "updating document");
			const { id, name, description, categories } = data;
			try {
				let categoriesToDisconnect: DocumentCategory[] = [];
				if (categories) {
					const previousDocument = await db.document.findUnique({
						include: {
							categories: true,
						},
						where: {
							id,
						},
					});
					if (previousDocument === null)
						return Result.error(new NotFoundError("Document does not exist"));
					categoriesToDisconnect = previousDocument.categories.filter(
						(category) =>
							!categories?.some(
								(newCategory) => newCategory.name === category.name,
							),
					);
				}

				const document = await db.document.update({
					include: {
						categories: true,
					},
					where: {
						id,
					},
					data: {
						name,
						description,
						categories: {
							connectOrCreate: categories?.map((category) => ({
								create: {
									name: category.name,
								},
								where: {
									name: category.name,
								},
							})),
							disconnect: categoriesToDisconnect.map((category) => ({
								id: category.id,
							})),
						},
					},
				});
				return Result.success({ document: new Document(document) });
			} catch (err) {
				if (err instanceof PrismaClientKnownRequestError) {
					if (
						err.code === prismaKnownErrorCodes.ERR_NOT_FOUND ||
						err.code === prismaKnownErrorCodes.ERR_INCONSISTENT_COLUMN_DATA
					) {
						return Result.error(new NotFoundError("Document does not exist"));
					}
				}
				return Result.error(
					new InternalServerError("failed to update document", err),
				);
			}
		},

		async findMany(ctx, by) {
			let where: Prisma.DocumentWhereInput = {};
			if (by?.categories) {
				where = {
					categories: {
						some: {
							id: {
								in: by.categories.map((category) => category.id),
							},
						},
					},
				};
			}
			try {
				ctx.log.info("finding documents");
				const findManyPromise = db.document.findMany({
					include: {
						categories: true,
					},
					where,
				});
				const countPromise = db.document.count({
					where,
				});
				const [documents, total] = await Promise.all([
					findManyPromise,
					countPromise,
				]);
				return Result.success({
					documents: documents.map((document) => new Document(document)),
					total,
				});
			} catch (err) {
				return Result.error(
					new InternalServerError("failed to find documents", err),
				);
			}
		},

		async find(ctx, params) {
			ctx.log.info({ params }, "finding document");
			try {
				const document = await db.document.findUnique({
					where: { id: params.id },
					include: { categories: true },
				});
				if (document === null)
					return Result.error(new NotFoundError("Document does not exist"));
				return Result.success({ document: new Document(document) });
			} catch (err) {
				return Result.error(
					new InternalServerError("failed to find document", err),
				);
			}
		},
	};
}

export { buildDocuments };
export type { DocumentDependencies };

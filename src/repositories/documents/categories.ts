import type { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { DocumentCategory } from "~/domain/documents.js";
import { InternalServerError, NotFoundError } from "~/domain/errors.js";
import { prismaKnownErrorCodes } from "~/lib/prisma.js";
import { Result } from "~/lib/result.js";
import type { CategoryRepositoryType } from "~/services/documents/categories.js";

type CategoryDependencies = {
	db: PrismaClient;
};

function buildCategories({
	db,
}: CategoryDependencies): CategoryRepositoryType["categories"] {
	return {
		async delete(ctx, { id }) {
			ctx.log.info({ documentId: id }, "deleting document");
			try {
				const category = await db.documentCategory.delete({
					where: {
						id,
					},
				});
				return Result.success({ category: new DocumentCategory(category) });
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
		async findMany(ctx) {
			try {
				ctx.log.info("finding documents");
				const findManyPromise = db.documentCategory.findMany();
				const countPromise = db.documentCategory.count();
				const [categories, total] = await Promise.all([
					findManyPromise,
					countPromise,
				]);
				return Result.success({
					categories: categories.map(
						(category) => new DocumentCategory(category),
					),
					total,
				});
			} catch (err) {
				return Result.error(
					new InternalServerError("failed to find categories", err),
				);
			}
		},
	};
}

export { buildCategories };
export type { CategoryDependencies };

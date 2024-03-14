import type { Prisma, PrismaClient } from "@prisma/client";
import { Document } from "~/domain/documents.js";
import { InternalServerError } from "~/domain/errors.js";
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
		async delete(_ctx, _data) {
			return Result.error(new InternalServerError("not implemented yet"));
		},
		async update(_ctx, _data) {
			return Result.error(new InternalServerError("not implemented yet"));
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
	};
}

export { buildDocuments };
export type { DocumentDependencies };

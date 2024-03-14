import type { PrismaClient } from "@prisma/client";
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
					data: {
						name: data.name,
						file: {
							connect: {
								id: data.fileId,
							},
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

		async findMany(ctx) {
			try {
				ctx.log.info("finding documents");
				const findManyPromise = db.document.findMany();
				const countPromise = db.document.count();
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

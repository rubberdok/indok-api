import type { PrismaClient } from "@prisma/client";
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
				return Result.success({ document });
			} catch (err) {
				return Result.error(
					new InternalServerError("failed to create document", err),
				);
			}
		},
		async delete(ctx, data) {
			return Result.error(new InternalServerError("not implemented yet"));
		},
		async update(ctx, data) {
			return Result.error(new InternalServerError("not implemented yet"));
		},
		async findMany(ctx) {
			return Result.error(new InternalServerError("not implemented yet"));
		},
	};
}

export { buildDocuments };
export type { DocumentDependencies };

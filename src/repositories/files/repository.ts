import type { PrismaClient } from "@prisma/client";
import { InternalServerError, NotFoundError } from "~/domain/errors.js";
import { RemoteFile } from "~/domain/files.js";
import type { FileRepository as FileRepositoryType } from "~/services/files/index.js";

type Dependencies = {
	db: PrismaClient;
};

function FileRepository({ db }: Dependencies): FileRepositoryType {
	return {
		async getFile(params) {
			try {
				const file = await db.file.findUnique({
					where: {
						id: params.id,
					},
				});
				if (!file) {
					return {
						ok: false,
						error: new NotFoundError("File not found"),
					};
				}
				return {
					ok: true,
					data: {
						file: new RemoteFile(file),
					},
				};
			} catch (err) {
				return {
					ok: false,
					error: new InternalServerError("Error getting file", err),
				};
			}
		},
		async createFile({ userId, id, name }) {
			try {
				const file = await db.file.create({
					data: {
						id,
						userId,
						name,
					},
				});
				return {
					ok: true,
					data: {
						file: new RemoteFile(file),
					},
				};
			} catch (err) {
				return {
					ok: false,
					error: new InternalServerError("Error creating file", err),
				};
			}
		},
	};
}

export { FileRepository };

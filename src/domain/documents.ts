import type { Context } from "~/lib/context.js";
import type { ResultAsync } from "~/lib/result.js";
import type {
	DownstreamServiceError,
	InternalServerError,
	InvalidArgumentErrorV2,
	PermissionDeniedError,
	UnauthorizedError,
} from "./errors.js";

class Document {
	name: string;
	fileId: string;
	createdAt: Date;
	updatedAt: Date;
	id: string;

	constructor(params: {
		name: string;
		fileId: string;
		createdAt: Date;
		updatedAt: Date;
		id: string;
	}) {
		const { name, fileId, createdAt, updatedAt, id } = params;
		this.name = name;
		this.fileId = fileId;
		this.createdAt = createdAt;
		this.updatedAt = updatedAt;
		this.id = id;
	}
}

type DocumentService = {
	documents: {
		create(
			ctx: Context,
			data: Pick<Document, "name"> & { fileExtension: string },
		): ResultAsync<
			{ document: Document; uploadUrl: string },
			| InvalidArgumentErrorV2
			| InternalServerError
			| PermissionDeniedError
			| UnauthorizedError
			| DownstreamServiceError
		>;
		update(
			ctx: Context,
			data: Pick<Document, "id"> & Partial<Pick<Document, "name">>,
		): ResultAsync<
			{ document: Document },
			| InvalidArgumentErrorV2
			| InternalServerError
			| PermissionDeniedError
			| UnauthorizedError
		>;
		delete(
			ctx: Context,
			data: Pick<Document, "id">,
		): ResultAsync<
			{ document: Document },
			| InvalidArgumentErrorV2
			| InternalServerError
			| PermissionDeniedError
			| UnauthorizedError
		>;
		findMany(
			ctx: Context,
		): ResultAsync<
			{ documents: Document[]; total: number },
			InternalServerError | PermissionDeniedError | UnauthorizedError
		>;
	};
};

export type { DocumentService };
export { Document };

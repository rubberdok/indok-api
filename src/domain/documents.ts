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
	constructor(
		public name: string,
		public fileId: string,
		public createdAt: Date,
		public updatedAt: Date,
		public id: string,
	) {}
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

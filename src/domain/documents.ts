import type { Context } from "~/lib/context.js";
import type { ResultAsync } from "~/lib/result.js";
import type {
	DownstreamServiceError,
	InternalServerError,
	InvalidArgumentErrorV2,
	NotFoundError,
	PermissionDeniedError,
	UnauthorizedError,
} from "./errors.js";

class DocumentCategory {
	id: string;
	name: string;

	constructor(params: { id: string; name: string }) {
		const { id, name } = params;
		this.id = id;
		this.name = name;
	}
}

class Document {
	name: string;
	fileId: string;
	createdAt: Date;
	updatedAt: Date;
	id: string;
	description: string;
	categories: DocumentCategory[];

	constructor(params: {
		name: string;
		fileId: string;
		createdAt: Date;
		updatedAt: Date;
		id: string;
		description?: string;
		categories?: DocumentCategory[];
	}) {
		const { name, fileId, createdAt, updatedAt, id, description, categories } =
			params;
		this.name = name;
		this.fileId = fileId;
		this.createdAt = createdAt;
		this.updatedAt = updatedAt;
		this.id = id;
		this.description = description ?? "";
		this.categories = categories ?? [];
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
			data: Pick<Document, "id"> &
				Partial<{
					name: string | null;
					description: string | null;
					categories: { name: string }[] | null;
				}>,
		): ResultAsync<
			{ document: Document },
			| InvalidArgumentErrorV2
			| InternalServerError
			| PermissionDeniedError
			| UnauthorizedError
			| NotFoundError
		>;
		delete(
			ctx: Context,
			data: Pick<Document, "id">,
		): ResultAsync<
			{ document: Document },
			| NotFoundError
			| InternalServerError
			| PermissionDeniedError
			| UnauthorizedError
		>;
		findMany(
			ctx: Context,
			by?: { categories?: { id: string }[] | null } | null,
		): ResultAsync<
			{ documents: Document[]; total: number },
			InternalServerError | PermissionDeniedError | UnauthorizedError
		>;
		find(
			ctx: Context,
			params: { id: string },
		): ResultAsync<
			{ document: Document },
			| NotFoundError
			| InternalServerError
			| PermissionDeniedError
			| UnauthorizedError
		>;
	};
	categories: {
		findMany(
			ctx: Context,
		): ResultAsync<
			{ categories: DocumentCategory[]; total: number },
			InternalServerError | PermissionDeniedError | UnauthorizedError
		>;
		delete(
			ctx: Context,
			params: { id: string },
		): ResultAsync<
			{ category: DocumentCategory },
			| NotFoundError
			| InternalServerError
			| PermissionDeniedError
			| UnauthorizedError
		>;
	};
};

export type { DocumentService };
export { Document, DocumentCategory };

import { faker } from "@faker-js/faker";
import { mockDeep } from "jest-mock-extended";
import { Document } from "~/domain/documents.js";
import {
	DomainErrorType,
	DownstreamServiceError,
	InternalServerError,
	InvalidArgumentError,
	InvalidArgumentErrorV2,
	NotFoundError,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
import { FeaturePermission } from "~/domain/organizations.js";
import { makeMockContext } from "~/lib/context.js";
import { Result } from "~/lib/result.js";
import {
	type DocumentRepositoryType,
	type FileService,
	type PermissionService,
	buildDocuments,
} from "./documents.js";

describe("Documents service", () => {
	describe("#create", () => {
		it("returns UnauthorizedError if the user is not authenticated", async () => {
			const { service } = makeDependencies();

			const result = await service.create(makeMockContext(null), {
				name: faker.word.adjective(),
				fileExtension: faker.string.uuid(),
			});

			expect(result).toEqual(Result.error(expect.any(UnauthorizedError)));
		});

		it("returns PermissionDeniedError if the user does not have permission", async () => {
			const { service, permissions } = makeDependencies();
			permissions.hasFeaturePermission.mockResolvedValueOnce(false);

			const result = await service.create(
				makeMockContext({ id: faker.string.uuid() }),
				{
					name: faker.word.adjective(),
					fileExtension: faker.string.uuid(),
				},
			);

			expect(result).toEqual(Result.error(expect.any(PermissionDeniedError)));
		});

		it("requires ARCHIVE_WRITE_DOCUMENTS permission", async () => {
			const { service, permissions } = makeDependencies();
			const ctx = makeMockContext({ id: faker.string.uuid() });
			await service.create(ctx, {
				name: faker.word.adjective(),
				fileExtension: faker.string.uuid(),
			});

			expect(permissions.hasFeaturePermission).toHaveBeenCalledWith(ctx, {
				featurePermission: "ARCHIVE_WRITE_DOCUMENTS",
			});
		});

		it("returns InvalidArugmentError if name is empty", async () => {
			const { service, permissions } = makeDependencies();
			permissions.hasFeaturePermission.mockResolvedValueOnce(true);
			const result = await service.create(
				makeMockContext({ id: faker.string.uuid() }),
				{
					name: "",
					fileExtension: faker.string.uuid(),
				},
			);
			expect(result).toEqual(Result.error(expect.any(InvalidArgumentErrorV2)));
		});

		it("returns DownstreamServiceError file service returns DownstreamServiceError", async () => {
			const { service, permissions, files } = makeDependencies();
			permissions.hasFeaturePermission.mockResolvedValueOnce(true);
			files.createFileUploadUrl.mockResolvedValueOnce(
				Result.error(
					new DownstreamServiceError("Error creating file upload url"),
				),
			);
			const result = await service.create(
				makeMockContext({ id: faker.string.uuid() }),
				{
					name: faker.word.adjective(),
					fileExtension: faker.string.uuid(),
				},
			);
			expect(result).toEqual(Result.error(expect.any(DownstreamServiceError)));
		});

		it("returns InternalServerError file service returns InternalServerError", async () => {
			const { service, permissions, files } = makeDependencies();
			permissions.hasFeaturePermission.mockResolvedValueOnce(true);
			files.createFileUploadUrl.mockResolvedValueOnce(
				Result.error(new InternalServerError("Error creating file upload url")),
			);
			const result = await service.create(
				makeMockContext({ id: faker.string.uuid() }),
				{
					name: faker.word.adjective(),
					fileExtension: faker.string.uuid(),
				},
			);
			expect(result).toEqual(Result.error(expect.any(InternalServerError)));
		});

		it("returns InvalidArgumentErrorV2 file service returns InvalidArgumentError", async () => {
			const { service, permissions, files } = makeDependencies();
			permissions.hasFeaturePermission.mockResolvedValueOnce(true);
			files.createFileUploadUrl.mockResolvedValueOnce(
				Result.error(
					new InvalidArgumentError("Error creating file upload url"),
				),
			);
			const result = await service.create(
				makeMockContext({ id: faker.string.uuid() }),
				{
					name: faker.word.adjective(),
					fileExtension: faker.string.uuid(),
				},
			);
			expect(result).toEqual(Result.error(expect.any(InvalidArgumentErrorV2)));
		});

		it("returns UnauthorizedError file service returns UnauthorizedError", async () => {
			const { service, permissions, files } = makeDependencies();
			permissions.hasFeaturePermission.mockResolvedValueOnce(true);
			files.createFileUploadUrl.mockResolvedValueOnce(
				Result.error(new UnauthorizedError("unauthorized")),
			);
			const result = await service.create(
				makeMockContext({ id: faker.string.uuid() }),
				{
					name: faker.word.adjective(),
					fileExtension: faker.string.uuid(),
				},
			);
			expect(result).toEqual(Result.error(expect.any(UnauthorizedError)));
		});

		it("returns InternalServerError if repository returns InternalServerError", async () => {
			const { service, permissions, files, repository } = makeDependencies();
			permissions.hasFeaturePermission.mockResolvedValueOnce(true);
			files.createFileUploadUrl.mockResolvedValueOnce(
				Result.success({
					file: {
						id: faker.string.uuid(),
						name: faker.system.fileName(),
						userId: faker.string.uuid(),
					},
					url: faker.internet.url(),
				}),
			);
			repository.documents.create.mockResolvedValueOnce(
				Result.error(new InternalServerError("Error creating document")),
			);

			const result = await service.create(
				makeMockContext({ id: faker.string.uuid() }),
				{
					name: faker.word.adjective(),
					fileExtension: faker.string.uuid(),
				},
			);
			expect(result).toEqual(Result.error(expect.any(InternalServerError)));
		});

		it("creates a new document and returns an upload URL", async () => {
			const { service, permissions, files, repository } = makeDependencies();
			permissions.hasFeaturePermission.mockResolvedValueOnce(true);
			files.createFileUploadUrl.mockResolvedValueOnce(
				Result.success({
					file: {
						id: faker.string.uuid(),
						name: faker.system.fileName(),
						userId: faker.string.uuid(),
					},
					url: faker.internet.url(),
				}),
			);
			repository.documents.create.mockResolvedValueOnce({
				ok: true,
				data: {
					document: makeDocument(),
				},
			});

			const result = await service.create(
				makeMockContext({ id: faker.string.uuid() }),
				{
					name: faker.word.adjective(),
					fileExtension: faker.string.uuid(),
				},
			);
			expect(result).toEqual(
				Result.success({
					document: expect.objectContaining({
						id: expect.any(String),
					}),
					uploadUrl: expect.any(String),
				}),
			);
		});
	});

	describe("#update", () => {
		it("returns UnauthorizedError if the user is not authenticated", async () => {
			const { service } = makeDependencies();

			const result = await service.update(makeMockContext(null), {
				id: faker.string.uuid(),
				name: faker.word.adjective(),
			});

			expect(result).toEqual(Result.error(expect.any(UnauthorizedError)));
		});

		it("returns PermissionDeniedError if the user does not have permission", async () => {
			const { service, permissions } = makeDependencies();
			permissions.hasFeaturePermission.mockResolvedValueOnce(false);

			const result = await service.update(
				makeMockContext({ id: faker.string.uuid() }),
				{
					name: faker.word.adjective(),
					id: faker.string.uuid(),
				},
			);

			expect(result).toEqual(Result.error(expect.any(PermissionDeniedError)));
		});

		it("requires ARCHIVE_WRITE_DOCUMENTS permission", async () => {
			const { service, permissions } = makeDependencies();
			const ctx = makeMockContext({ id: faker.string.uuid() });
			await service.update(ctx, {
				id: faker.string.uuid(),
				name: faker.word.adjective(),
			});

			expect(permissions.hasFeaturePermission).toHaveBeenCalledWith(ctx, {
				featurePermission: "ARCHIVE_WRITE_DOCUMENTS",
			});
		});

		it("returns InvalidArugmentError for invalid arguments", async () => {
			const { service, permissions } = makeDependencies();
			permissions.hasFeaturePermission.mockResolvedValueOnce(true);
			const result = await service.update(
				makeMockContext({ id: faker.string.uuid() }),
				{
					id: "not-a-uuid",
					name: "",
					description: 2 as unknown as string,
					categories: [{ name: "" }],
				},
			);
			expect(result).toEqual(
				Result.error(
					expect.objectContaining({
						type: DomainErrorType.InvalidArgumentError,
						reason: expect.objectContaining({
							id: expect.any(Array),
							name: expect.any(Array),
							description: expect.any(Array),
							categories: expect.any(Array),
						}),
					}),
				),
			);
		});

		it("updates the document", async () => {
			const { service, permissions, repository } = makeDependencies();
			permissions.hasFeaturePermission.mockResolvedValueOnce(true);
			repository.documents.update.mockResolvedValueOnce(
				Result.success({ document: makeDocument() }),
			);

			const result = await service.update(
				makeMockContext({ id: faker.string.uuid() }),
				{
					id: faker.string.uuid(),
					name: faker.word.adjective(),
				},
			);

			expect(result).toEqual(
				Result.success({
					document: expect.objectContaining({
						id: expect.any(String),
					}),
				}),
			);
		});

		it("returns internal server error if repo fails unexpectedly", async () => {
			const { service, permissions, repository } = makeDependencies();
			permissions.hasFeaturePermission.mockResolvedValueOnce(true);
			repository.documents.update.mockResolvedValueOnce(
				Result.error(new InternalServerError("")),
			);

			const result = await service.update(
				makeMockContext({ id: faker.string.uuid() }),
				{ id: faker.string.uuid() },
			);

			expect(result).toEqual(Result.error(expect.any(InternalServerError)));
		});

		it("returns not found error if repo returns not found", async () => {
			const { service, permissions, repository } = makeDependencies();
			permissions.hasFeaturePermission.mockResolvedValueOnce(true);
			repository.documents.update.mockResolvedValueOnce(
				Result.error(new NotFoundError("")),
			);

			const result = await service.update(
				makeMockContext({ id: faker.string.uuid() }),
				{ id: faker.string.uuid() },
			);

			expect(result).toEqual(Result.error(expect.any(NotFoundError)));
		});

		it("ignores nullish fields", async () => {
			const { service, permissions, repository } = makeDependencies();
			permissions.hasFeaturePermission.mockResolvedValueOnce(true);
			repository.documents.update.mockResolvedValueOnce(
				Result.success({ document: makeDocument() }),
			);

			const result = await service.update(
				makeMockContext({ id: faker.string.uuid() }),
				{
					id: faker.string.uuid(),
					description: null,
					name: undefined,
					categories: null,
				},
			);

			expect(result).toEqual(
				Result.success({ document: expect.any(Document) }),
			);
			expect(repository.documents.update).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					id: expect.any(String),
					description: undefined,
					name: undefined,
					categories: undefined,
				}),
			);
		});
	});

	describe("#delete", () => {
		it("returns UnauthorizedError if the user is not authenticated", async () => {
			const { service } = makeDependencies();

			const result = await service.delete(makeMockContext(null), {
				id: faker.string.uuid(),
			});

			expect(result).toEqual(Result.error(expect.any(UnauthorizedError)));
		});

		it("returns PermissionDeniedError if the user does not have permission", async () => {
			const { service, permissions } = makeDependencies();
			permissions.hasFeaturePermission.mockResolvedValueOnce(false);

			const result = await service.findMany(
				makeMockContext({ id: faker.string.uuid() }),
			);

			expect(result).toEqual(Result.error(expect.any(PermissionDeniedError)));
		});

		it("requires ARCHIVE_WRITE_DOCUMENTS permission", async () => {
			const { service, permissions } = makeDependencies();
			const ctx = makeMockContext({ id: faker.string.uuid() });
			await service.delete(ctx, { id: faker.string.uuid() });

			expect(permissions.hasFeaturePermission).toHaveBeenCalledWith(ctx, {
				featurePermission: "ARCHIVE_WRITE_DOCUMENTS",
			});
		});

		it("deletes the document", async () => {
			const { service, permissions, repository } = makeDependencies();
			permissions.hasFeaturePermission.mockResolvedValueOnce(true);
			repository.documents.delete.mockResolvedValueOnce(
				Result.success({ document: makeDocument() }),
			);

			const result = await service.delete(
				makeMockContext({ id: faker.string.uuid() }),
				{ id: faker.string.uuid() },
			);

			expect(result).toEqual(
				Result.success({
					document: expect.objectContaining({
						id: expect.any(String),
					}),
				}),
			);
		});

		it("returns internal server error if repo fails unexpectedly", async () => {
			const { service, permissions, repository } = makeDependencies();
			permissions.hasFeaturePermission.mockResolvedValueOnce(true);
			repository.documents.delete.mockResolvedValueOnce(
				Result.error(new InternalServerError("")),
			);

			const result = await service.delete(
				makeMockContext({ id: faker.string.uuid() }),
				{ id: faker.string.uuid() },
			);

			expect(result).toEqual(Result.error(expect.any(InternalServerError)));
		});

		it("returns not found error if repo returns not found", async () => {
			const { service, permissions, repository } = makeDependencies();
			permissions.hasFeaturePermission.mockResolvedValueOnce(true);
			repository.documents.delete.mockResolvedValueOnce(
				Result.error(new NotFoundError("")),
			);

			const result = await service.delete(
				makeMockContext({ id: faker.string.uuid() }),
				{ id: faker.string.uuid() },
			);

			expect(result).toEqual(Result.error(expect.any(NotFoundError)));
		});
	});

	describe("#findMany", () => {
		it("returns UnauthorizedError if the user is not authenticated", async () => {
			const { service } = makeDependencies();

			const result = await service.findMany(makeMockContext(null));

			expect(result).toEqual(Result.error(expect.any(UnauthorizedError)));
		});

		it("returns PermissionDeniedError if the user does not have permission", async () => {
			const { service, permissions } = makeDependencies();
			permissions.hasFeaturePermission.mockResolvedValueOnce(false);

			const result = await service.create(
				makeMockContext({ id: faker.string.uuid() }),
				{
					name: faker.word.adjective(),
					fileExtension: faker.string.uuid(),
				},
			);

			expect(result).toEqual(Result.error(expect.any(PermissionDeniedError)));
		});

		it("requires ARCHIVE_VIEW_DOCUMENTS permission", async () => {
			const { service, permissions } = makeDependencies();
			const ctx = makeMockContext({ id: faker.string.uuid() });
			await service.findMany(ctx);

			expect(permissions.hasFeaturePermission).toHaveBeenCalledWith(ctx, {
				featurePermission: "ARCHIVE_VIEW_DOCUMENTS",
			});
		});

		it("returns documents and the total count", async () => {
			const { service, permissions, repository } = makeDependencies();
			permissions.hasFeaturePermission.mockResolvedValueOnce(true);
			repository.documents.findMany.mockResolvedValueOnce(
				Result.success({
					documents: [makeDocument()],
					total: 1,
				}),
			);

			const result = await service.findMany(
				makeMockContext({ id: faker.string.uuid() }),
			);

			expect(result).toEqual(
				Result.success({
					documents: expect.arrayContaining([
						expect.objectContaining({
							id: expect.any(String),
						}),
					]),
					total: expect.any(Number),
				}),
			);
		});
	});

	describe("#find", () => {
		it("returns the matching document if the user has permission", async () => {
			const { service, repository, permissions } = makeDependencies();
			permissions.hasFeaturePermission.mockResolvedValueOnce(true);
			repository.documents.find.mockResolvedValueOnce(
				Result.success({ document: makeDocument() }),
			);

			const result = await service.find(
				makeMockContext({ id: faker.string.uuid() }),
				{ id: faker.string.uuid() },
			);

			expect(result).toEqual(
				Result.success({ document: expect.any(Document) }),
			);
		});

		it("returns permission denied if the user does not have the appropriate permission", async () => {
			const { service, repository, permissions } = makeDependencies();
			permissions.hasFeaturePermission.mockResolvedValueOnce(false);
			repository.documents.find.mockResolvedValueOnce(
				Result.success({ document: makeDocument() }),
			);

			const result = await service.find(
				makeMockContext({ id: faker.string.uuid() }),
				{ id: faker.string.uuid() },
			);

			expect(result).toEqual(Result.error(expect.any(PermissionDeniedError)));
		});

		it("requires the ARCHIVE_VIEW_DOCUMENT permission", async () => {
			const { service, permissions } = makeDependencies();
			const ctx = makeMockContext({ id: faker.string.uuid() });

			await service.find(ctx, { id: faker.string.uuid() });

			expect(permissions.hasFeaturePermission).toHaveBeenCalledWith(ctx, {
				featurePermission: FeaturePermission.ARCHIVE_VIEW_DOCUMENTS,
			});
		});

		it("returns UnauthorizedError if the user is not logged in", async () => {
			const { service } = makeDependencies();

			const result = await service.find(makeMockContext(null), {
				id: faker.string.uuid(),
			});

			expect(result).toEqual(Result.error(expect.any(UnauthorizedError)));
		});
	});
});

function makeDocument(): Document {
	return new Document({
		id: faker.string.uuid(),
		name: faker.word.adjective(),
		fileId: faker.string.uuid(),
		createdAt: new Date(),
		updatedAt: new Date(),
	});
}

function makeDependencies() {
	const repository = mockDeep<DocumentRepositoryType>();
	const permissions = mockDeep<PermissionService>();
	const files = mockDeep<FileService>();
	const service = buildDocuments({ repository, permissions, files });
	return { repository, permissions, files, service };
}

import { faker } from "@faker-js/faker";
import { mockDeep } from "jest-mock-extended";
import {
	DownstreamServiceError,
	InternalServerError,
	InvalidArgumentError,
	InvalidArgumentErrorV2,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
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
					document: {
						createdAt: new Date(),
						fileId: faker.string.uuid(),
						id: faker.string.uuid(),
						name: faker.word.adjective(),
						updatedAt: new Date(),
					},
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
	});
});

function makeDependencies() {
	const repository = mockDeep<DocumentRepositoryType>();
	const permissions = mockDeep<PermissionService>();
	const files = mockDeep<FileService>();
	const service = buildDocuments({ repository, permissions, files });
	return { repository, permissions, files, service };
}

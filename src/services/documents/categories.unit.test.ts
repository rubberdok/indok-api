import { faker } from "@faker-js/faker";
import { mockDeep } from "jest-mock-extended";
import { DocumentCategory } from "~/domain/documents.js";
import { PermissionDeniedError, UnauthorizedError } from "~/domain/errors.js";
import { makeMockContext } from "~/lib/context.js";
import { Result } from "~/lib/result.js";
import {
	type CategoryRepositoryType,
	type PermissionService,
	buildCategories,
} from "./categories.js";

describe("Document service", () => {
	describe("categories", () => {
		describe("#findMany", () => {
			it("requires ARCHIVE_VIEW_DOCUMENTS permission", async () => {
				const { permissions, service } = makeDependencies();
				const ctx = makeMockContext({ id: faker.string.uuid() });
				await service.findMany(ctx);

				expect(permissions.hasFeaturePermission).toHaveBeenCalledWith(ctx, {
					featurePermission: "ARCHIVE_VIEW_DOCUMENTS",
				});
			});

			it("returns unauthorized error if not logged in", async () => {
				const { service } = makeDependencies();
				const ctx = makeMockContext(null);
				const result = await service.findMany(ctx);

				expect(result).toEqual(Result.error(expect.any(UnauthorizedError)));
			});

			it("returns unauthorized error if not logged in", async () => {
				const { service } = makeDependencies();
				const ctx = makeMockContext(null);
				const result = await service.findMany(ctx);

				expect(result).toEqual(Result.error(expect.any(UnauthorizedError)));
			});

			it("returns permission denied if the user does not have permission", async () => {
				const { service, permissions } = makeDependencies();
				const ctx = makeMockContext({ id: faker.string.uuid() });

				permissions.hasFeaturePermission.mockResolvedValue(false);
				const result = await service.findMany(ctx);

				expect(result).toEqual(Result.error(expect.any(PermissionDeniedError)));
			});

			it("returns document categories", async () => {
				const { service, permissions, repository } = makeDependencies();
				const ctx = makeMockContext({ id: faker.string.uuid() });

				repository.categories.findMany.mockResolvedValue(
					Result.success({ total: 0, categories: [] }),
				);
				permissions.hasFeaturePermission.mockResolvedValue(true);
				const result = await service.findMany(ctx);

				expect(result).toEqual(Result.success({ total: 0, categories: [] }));
			});
		});

		describe("#delete", () => {
			it("requires ARCHIVE_WRITE_DOCUMENTS permission", async () => {
				const { permissions, service } = makeDependencies();
				const ctx = makeMockContext({ id: faker.string.uuid() });
				await service.delete(ctx, { id: faker.string.uuid() });

				expect(permissions.hasFeaturePermission).toHaveBeenCalledWith(ctx, {
					featurePermission: "ARCHIVE_WRITE_DOCUMENTS",
				});
			});

			it("returns unauthorized error if not logged in", async () => {
				const { service } = makeDependencies();
				const ctx = makeMockContext(null);
				const result = await service.delete(ctx, { id: faker.string.uuid() });

				expect(result).toEqual(Result.error(expect.any(UnauthorizedError)));
			});

			it("returns unauthorized error if not logged in", async () => {
				const { service } = makeDependencies();
				const ctx = makeMockContext(null);
				const result = await service.delete(ctx, { id: faker.string.uuid() });

				expect(result).toEqual(Result.error(expect.any(UnauthorizedError)));
			});

			it("returns permission denied if the user does not have permission", async () => {
				const { service, permissions } = makeDependencies();
				const ctx = makeMockContext({ id: faker.string.uuid() });

				permissions.hasFeaturePermission.mockResolvedValue(false);
				const result = await service.delete(ctx, { id: faker.string.uuid() });

				expect(result).toEqual(Result.error(expect.any(PermissionDeniedError)));
			});

			it("deletes a category", async () => {
				const { service, permissions, repository } = makeDependencies();
				const ctx = makeMockContext({ id: faker.string.uuid() });
				const expected = new DocumentCategory({
					id: faker.string.uuid(),
					name: faker.string.uuid(),
				});

				repository.categories.delete.mockResolvedValue(
					Result.success({
						category: expected,
					}),
				);
				permissions.hasFeaturePermission.mockResolvedValue(true);
				const result = await service.delete(ctx, { id: expected.id });

				expect(result).toEqual(Result.success({ category: expected }));
			});
		});
	});
});

function makeDependencies() {
	const repository = mockDeep<CategoryRepositoryType>();
	const permissions = mockDeep<PermissionService>();
	const service = buildCategories({ repository, permissions });
	return { repository, permissions, service };
}

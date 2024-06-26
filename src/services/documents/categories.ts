import type { DocumentCategory, DocumentService } from "~/domain/documents.js";
import {
  InternalServerError,
  type NotFoundError,
  PermissionDeniedError,
  UnauthorizedError,
} from "~/domain/errors.js";
import type { FeaturePermissionType } from "~/domain/organizations.js";
import type { Context } from "~/lib/context.js";
import { Result, type ResultAsync } from "~/lib/result.js";

type CategoryRepositoryType = {
  categories: {
    findMany(
      ctx: Context,
    ): ResultAsync<{ categories: DocumentCategory[], total: number }, InternalServerError>;
    delete(
      ctx: Context,
      data: { id: string },
    ): ResultAsync<
      { category: DocumentCategory },
      InternalServerError | NotFoundError
    >;
  };
};

type PermissionService = {
  hasFeaturePermission(
    ctx: Context,
    data: { featurePermission: FeaturePermissionType },
  ): Promise<boolean>;
};

type CategoryDependencies = {
  repository: CategoryRepositoryType;
  permissions: PermissionService;
};

function buildCategories({
  repository,
  permissions,
}: CategoryDependencies): DocumentService["categories"] {
  return {
    async delete(ctx, params) {
      if (!ctx.user)
        return Result.error(
          new UnauthorizedError(
            "You must be logged in to perform this action.",
          ),
        );
      const hasPermission = await permissions.hasFeaturePermission(ctx, {
        featurePermission: "ARCHIVE_WRITE_DOCUMENTS",
      });
      if (!hasPermission)
        return Result.error(
          new PermissionDeniedError(
            "You do not have the permission required to perform this action.",
          ),
        );

      const deleteResult = await repository.categories.delete(ctx, params);
      if (!deleteResult.ok) {
        switch (deleteResult.error.name) {
          case "NotFoundError":
            return Result.error(deleteResult.error);
          case "InternalServerError":
            return Result.error(
              new InternalServerError(
                "Unexpected error when deleting category",
                deleteResult.error,
              ),
            );
        }
      }
      return Result.success({ category: deleteResult.data.category });
    },

    async findMany(ctx) {
      if (!ctx.user)
        return Result.error(
          new UnauthorizedError(
            "You must be logged in to perform this action.",
          ),
        );
      const hasPermission = await permissions.hasFeaturePermission(ctx, {
        featurePermission: "ARCHIVE_VIEW_DOCUMENTS",
      });
      if (!hasPermission)
        return Result.error(
          new PermissionDeniedError(
            "You do not have the permission required to perform this action.",
          ),
        );
      return await repository.categories.findMany(ctx);
    },
  };
}

export { buildCategories };
export type { CategoryDependencies, CategoryRepositoryType, PermissionService };

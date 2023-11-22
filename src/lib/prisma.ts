import prisma from "@prisma/client";
import { execa } from "execa";
import { FastifyInstance } from "fastify";

const { PrismaClient } = prisma;
export default new PrismaClient();

interface MigrationHealthCheckReturnType {
  status: boolean;
  message?: string;
}

/**
 * Health check that returns `true` if the Prisma migrations are reflected
 * in the database, `false` otherwise.
 *
 * It calls the Prisma CLI directly with `prisma migrate status`,
 * which exits with code 0 if the migrations are reflected in the database,
 * and 1 otherwise.
 *
 * @returns status - `true` if the migrations are reflected in the database, `false` otherwise
 * @returns message - The error message if the migrations are not reflected in the database
 */
export async function migrationHealthCheck(app: FastifyInstance): Promise<MigrationHealthCheckReturnType> {
  try {
    app.log.info("Running migration health check");
    await execa("pnpm", ["exec", "prisma", "migrate", "status"]);
    app.log.info("Migration health check passed");
    return { status: true };
  } catch (err) {
    app.log.error(err, "Migration health check failed", err);
    if (err instanceof Error) {
      return { status: false, message: "Missing migrations" };
    }
    return { status: false, message: "Unknown error" };
  }
}

export const prismaKnownErrorCodes = {
  ERR_UNIQUE_CONSTRAINT_VIOLATION: "P2002",
  ERR_NOT_FOUND: "P2025",
} as const;

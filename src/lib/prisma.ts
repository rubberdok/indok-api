import { PrismaClient } from "@prisma/client";
import { execa } from "execa";
import { FastifyInstance } from "fastify";
import { env } from "~/config.js";

/**
 * This is done to prevent hot reloading from creating new instances of PrismaClient in development
 * https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#prevent-hot-reloading-from-creating-new-instances-of-prismaclient
 */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

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
export async function migrationHealthCheck(
  app: FastifyInstance,
): Promise<MigrationHealthCheckReturnType> {
  try {
    app.log.info("Running migration health check");
    await execa("pnpm", ["exec", "prisma", "migrate", "status"], {
      timeout: 15_000,
    }).catch((err) => {
      if (err.timedOut) app.log.error(err, "Migration health check timed out");
      else app.log.error(err, "Migration health check failed");
      throw err;
    });
    app.log.info("Migration health check passed");
    return { status: true };
  } catch (err) {
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

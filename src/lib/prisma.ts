import { PrismaClient } from "@prisma/client";
import { env } from "~/config.js";

/**
 * This is done to prevent hot reloading from creating new instances of PrismaClient in development
 * https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#prevent-hot-reloading-from-creating-new-instances-of-prismaclient
 */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

export const prismaKnownErrorCodes = {
	ERR_UNIQUE_CONSTRAINT_VIOLATION: "P2002",
	ERR_NOT_FOUND: "P2025",
} as const;

import { PrismaClient } from "@prisma/client";
import { env } from "~/config.js";

/**
 * This is done to prevent hot reloading from creating new instances of PrismaClient in development
 * https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#prevent-hot-reloading-from-creating-new-instances-of-prismaclient
 */
const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient;
};
export const prisma =
	globalForPrisma.prisma ||
	new PrismaClient({
		log: [
			{
				emit: "event",
				level: "error",
			},
			{
				emit: "event",
				level: "warn",
			},
			{
				emit: "event",
				level: "info",
			},
			{
				emit: "event",
				level: "query",
			},
		],
	});
if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

export const prismaKnownErrorCodes = {
	ERR_UNIQUE_CONSTRAINT_VIOLATION: "P2002",
	ERR_NOT_FOUND: "P2025",
	ERR_INCONSISTENT_COLUMN_DATA: "P2023",
} as const;

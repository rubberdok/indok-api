import { randomUUID } from "node:crypto";
import type { FastifyBaseLogger } from "fastify";
import { isNil, merge } from "lodash-es";
import { pino } from "pino";
import { env } from "~/config.js";
import type { User } from "~/domain/users.js";
import { envToLogger } from "./fastify/logging.js";

export type Context = {
	user: User | null;
	log: FastifyBaseLogger;
};

export function makeMockContext(
	user?: Partial<User> | null,
	log?: FastifyBaseLogger,
): Context {
	const mockUser: User = {
		id: randomUUID(),
		feideId: randomUUID(),
		email: "example@example.com",
		allergies: "",
		canUpdateYear: true,
		createdAt: new Date(),
		firstLogin: false,
		firstName: "Example",
		lastName: "User",
		graduationYear: new Date().getFullYear() + 1,
		graduationYearUpdatedAt: null,
		lastLogin: new Date(),
		isSuperUser: false,
		phoneNumber: "40000000",
		updatedAt: new Date(),
		username: randomUUID(),
		studyProgramId: null,
	};
	let defaultLogger: FastifyBaseLogger = {
		child() {
			return this;
		},
		debug() {},
		error() {},
		info() {},
		fatal() {},
		warn() {},
		trace() {},
		silent() {},
		level: "debug",
	};
	if (env.LOG_ENABLED) {
		defaultLogger = pino(envToLogger.test);
	}

	return {
		user: isNil(user) ? null : merge(mockUser, user),
		log: log ?? defaultLogger,
	};
}

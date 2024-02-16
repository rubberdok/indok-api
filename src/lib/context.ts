import { randomUUID } from "crypto";
import type { FastifyBaseLogger } from "fastify";
import { isNil, merge } from "lodash-es";
import type { User } from "~/domain/users.js";

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
	return {
		user: isNil(user) ? null : merge(mockUser, user),
		log: log ?? {
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
		},
	};
}

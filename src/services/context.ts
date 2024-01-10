import type { FastifyBaseLogger } from "fastify";
import type { User } from "~/domain/users.js";

export type Context = {
	user: User | null;
	log: FastifyBaseLogger;
};

export function makeMockContext(
	user?: User | null,
	log?: FastifyBaseLogger,
): Context {
	return {
		user: user ?? null,
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

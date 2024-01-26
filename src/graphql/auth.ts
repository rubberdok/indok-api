import { AuthenticationError } from "~/domain/errors.js";
import type { User } from "~/domain/users.js";
import type { ApolloContext } from "~/lib/apollo-server.js";

type AuthenticatedContext = ApolloContext & {
	user: User;
};

/**
 * Assert that the user is authenticated
 *
 * @throws {AuthenticationError} - If the user is not authenticated
 * @param ctx - The context to check
 * @returns void, narrows the type of ctx to AuthenticatedContext
 */
export function assertIsAuthenticated(
	ctx: ApolloContext,
): asserts ctx is AuthenticatedContext {
	if (ctx.user === null)
		throw new AuthenticationError(
			"You must be logged in to perform this action.",
		);
}

import { AuthenticationError } from "@/domain/errors.js";
import { IContext } from "@/lib/apollo-server.js";

type AuthenticatedContext = IContext & { req: { session: { userId: string; authenticated: true } } };

/**
 * Assert that the user is authenticated
 *
 * @throws {AuthenticationError} - If the user is not authenticated
 * @param ctx - The context to check
 * @returns void, narrows the type of ctx to AuthenticatedContext
 */
export function assertIsAuthenticated(ctx: IContext): asserts ctx is AuthenticatedContext {
  const userId = ctx.req.session.userId;
  if (!userId) throw new AuthenticationError("You must be logged in to perform this action.");
}

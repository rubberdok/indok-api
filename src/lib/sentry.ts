import { ApolloServerPlugin } from "@apollo/server";
import { FastifyInstance } from "fastify";

import { errorCodes } from "@/domain/errors.js";

import { ApolloContext } from "./apollo-server.js";

const USER_FACING_ERRORS = new Set<string>([
  errorCodes.ERR_BAD_REQUEST,
  errorCodes.ERR_BAD_USER_INPUT,
  errorCodes.ERR_PERMISSION_DENIED,
  errorCodes.ERR_NOT_FOUND,
]);

function isErrorWithCode(error: Error | undefined): error is Error & { code: string } {
  if (!error) return false;
  return "code" in error;
}

function isUserFacingError(error?: Error): boolean {
  if (isErrorWithCode(error)) {
    return USER_FACING_ERRORS.has(error.code);
  }
  return false;
}

/**
 * Plugin for Apollo Server that reports errors to Sentry.
 * Adds additional details to the request to easily identify the failing operation.
 *
 * Adds the following details to the Sentry report:
 * - The kind of operation (query, mutation, or subscription)
 * - The user ID of the user making the request
 * - The query and variables
 * - The path of the failing operation
 *
 * Inspired by
 * https://blog.sentry.io/handling-graphql-errors-using-sentry/
 *
 * @todo Add transaction ID
 * @param app - The fastify app instance
 * @returns The Apollo Server plugin
 */
export const fastifyApolloSentryPlugin = (app: FastifyInstance): ApolloServerPlugin<ApolloContext> => {
  return {
    async requestDidStart() {
      return {
        async didEncounterErrors(ctx) {
          // If we couldn't parse the operation, don't
          // do anything here
          if (!ctx.operation) {
            return;
          }
          for (const err of ctx.errors) {
            // Only report internal server errors,
            // Filter out user-facing errors, we're not really interested in logging those to Sentry
            if (isUserFacingError(err.originalError)) {
              continue;
            }

            // Add scoped report details and send to Sentry
            app.Sentry.withScope((scope) => {
              // Annotate whether failing operation was query/mutation/subscription
              scope.setTag("kind", ctx.operation?.operation);

              // Annotate with user ID
              if (ctx.contextValue.req.session.userId) {
                scope.setUser({ id: ctx.contextValue.req.session.userId });
                scope.setExtra("authenticated", ctx.contextValue.req.session.authenticated);
              }

              // Log query and variables as extras
              // (make sure to strip out sensitive data!)
              scope.setExtra("query", ctx.request.query);
              scope.setExtra("variables", ctx.request.variables);
              if (err.path) {
                // We can also add the path as breadcrumb
                scope.addBreadcrumb({
                  category: "query-path",
                  message: err.path.join(" > "),
                  level: "debug",
                });
              }
              ctx.contextValue.req.log.error(err);
              app.Sentry.captureException(err);
            });
          }
        },
      };
    },
  };
};

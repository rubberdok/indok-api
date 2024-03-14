import { unwrapResolverError } from "@apollo/server/errors";
import type { Span } from "@sentry/node";
import type { FastifyBaseLogger, FastifyInstance } from "fastify";
import { GraphQLError, type GraphQLFormattedError } from "graphql";
import { merge } from "lodash-es";
import {
	InvalidArgumentError,
	errorCodes,
	isUserFacingError,
} from "~/domain/errors.js";
import type { User } from "~/domain/users.js";
import type { Services } from "./server.js";

export function getFormatErrorHandler(log?: Partial<FastifyInstance["log"]>) {
	const formatError = (
		formattedError: GraphQLFormattedError,
		error: unknown,
	): GraphQLFormattedError => {
		const originalError = unwrapResolverError(error);

		/**
		 * GraphQLErrors include errors such as invalid queries, missing required arguments, etc.
		 * and should be returned as-is.
		 */
		if (originalError instanceof GraphQLError) {
			return formattedError;
		}

		/**
		 * If the error is a user-facing error, we can return it as-is.
		 */
		if (isUserFacingError(originalError)) {
			if (originalError instanceof InvalidArgumentError) {
				return merge({}, formattedError, {
					message: originalError.message,
					extensions: {
						code: originalError.code,
						reason: originalError.reason,
					},
				});
			}

			return merge({}, formattedError, {
				message: originalError.message,
				extensions: {
					code: originalError.code,
				},
			});
		}

		if (originalError instanceof Error) {
			log?.error?.(originalError);
		}

		/**
		 * If the error is not a user-facing error, we should mask it and return a generic error message.
		 */
		return merge({}, formattedError, {
			message: "An unexpected error occurred",
			extensions: {
				code: errorCodes.ERR_INTERNAL_SERVER_ERROR,
			},
		});
	};
	return formatError;
}

interface ApolloContext extends Services {
	user: User | null;
	log: FastifyBaseLogger;
	span?: Span;
}

declare module "graphql" {
	interface GraphQLErrorExtensions {
		code: string;
	}
}

export type { ApolloContext };

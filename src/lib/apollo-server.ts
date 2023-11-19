import { unwrapResolverError } from "@apollo/server/errors";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { GraphQLFormattedError } from "graphql";
import { ZodError } from "zod";

import { BaseError, codes, InternalServerError, ValidationError } from "@/domain/errors.js";
import { ServiceDependencies } from "./fastify/dependencies.js";

export function getFormatErrorHandler(app?: FastifyInstance) {
  const formatError = (formattedError: GraphQLFormattedError, error: unknown): GraphQLFormattedError => {
    if (error instanceof ValidationError || error instanceof ZodError) {
      return {
        ...formattedError,
        message: error.message,
        extensions: {
          code: codes.ERR_BAD_USER_INPUT,
        },
      };
    }
    const originalError = unwrapResolverError(error);
    app?.log.error(originalError);

    let baseError: BaseError;
    if (originalError instanceof BaseError) {
      baseError = originalError;
    } else {
      baseError = new InternalServerError("Internal Server Error");
    }

    return {
      ...formattedError,
      message: baseError.message,
      extensions: {
        code: baseError.code,
      },
    };
  };
  return formatError;
}

export interface ApolloContext extends ServiceDependencies {
  res: FastifyReply;
  req: FastifyRequest;
}

import { unwrapResolverError } from "@apollo/server/errors";
import { GraphQLFormattedError } from "graphql";
import { ZodError } from "zod";

import { BaseError, codes, InternalServerError, ValidationError } from "@/core/errors.js";

export const formatError = (formattedError: GraphQLFormattedError, error: unknown): GraphQLFormattedError => {
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

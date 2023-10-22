import { GraphQLFormattedError } from "graphql";
import { ZodError } from "zod";

import { codes, ValidationError } from "@/core/errors.js";

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

  return {
    ...formattedError,
    message: "Internal server error",
    extensions: {
      code: codes.ERR_INTERNAL_SERVER_ERROR,
    },
  };
};

import { GraphQLFormattedError } from "graphql";
import { ZodError } from "zod";

import { codes, ValidationError } from "@/core/errors.js";

export const formatError = (formattedError: GraphQLFormattedError, error: unknown): GraphQLFormattedError => {
  if (error instanceof ValidationError || error instanceof ZodError) {
    return {
      ...formattedError,
      message: error.message,
      extensions: {
        code: codes.BAD_USER_INPUT,
      },
    };
  }

  return formattedError;
};

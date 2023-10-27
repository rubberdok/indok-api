/**
 * BaseError is the base class for all errors in the application.
 * It is used to provide a consistent way to handle errors in the application.
 * It is also used to provide a consistent way to handle errors in the client.
 *
 * @param name - The name of the error, e.g. "ValidationError", or "InvalidArgumentError"
 * @param description - Human-readable description of the error, e.g. "The email address is invalid"
 * @param code - A code that can be used to identify the error, e.g. "BAD_USER_INPUT", should be one of `codes`
 */
export class BaseError extends Error {
  constructor(
    name: string,
    public description: string,
    public code: ErrorCode = codes.ERR_INTERNAL_SERVER_ERROR
  ) {
    super(description);
    this.name = name;
    Error.captureStackTrace(this);
  }
}

export class ValidationError extends BaseError {
  constructor(description: string) {
    super("ValidationError", description, codes.ERR_BAD_USER_INPUT);
  }
}

export class InvalidArgumentError extends BaseError {
  constructor(description: string) {
    super("InvalidArgumentError", description, codes.ERR_BAD_USER_INPUT);
  }
}

export class InternalServerError extends BaseError {
  constructor(description: string) {
    super("InternalServerError", description, codes.ERR_INTERNAL_SERVER_ERROR);
  }
}

export class PermissionDeniedError extends BaseError {
  constructor(description: string) {
    super("PermissionDeniedError", description, codes.ERR_PERMISSION_DENIED);
  }
}

export class AuthenticationError extends BaseError {
  constructor(description: string) {
    super("AuthenticationError", description, codes.ERR_PERMISSION_DENIED);
  }
}

export class NotFoundError extends BaseError {
  constructor(description: string) {
    super("NotFoundError", description, codes.ERR_BAD_USER_INPUT);
  }
}

export class BadRequestError extends BaseError {
  constructor(description: string) {
    super("BadRequestError", description, codes.ERR_BAD_REQUEST);
  }
}

export const codes = {
  /**
   * ERR_NOT_FOUND should be used for errors that arise as a result of a resource not being found,
   * e.g. trying to get an organization that doesn't exist, trying to get a user that doesn't exist.
   */
  ERR_NOT_FOUND: "NOT_FOUND",
  /**
   * ERR_BAD_USER_INPUT should be used for errors that arise as a result of user input
   * that is invalid, e.g. an invalid email address, duplicate username, trying to delete
   * an organization that doesn't exist, etc.
   *
   * These errors are typically caused by the user, and as a consequence, are not tracked
   * as closely as other errors, i.e., not sent to Sentry.
   */
  ERR_BAD_USER_INPUT: "BAD_USER_INPUT",
  ERR_BAD_REQUEST: "BAD_REQUEST",
  /**
   * ERR_PERMISSION_DENIED should be used for errors that arise as a result of a user trying
   * to access a resource that they do not have permission to access, e.g. trying to delete
   * an organization where the user is not an admin.
   */
  ERR_PERMISSION_DENIED: "PERMISSION_DENIED",
  /**
   * ERR_INTERNAL_SERVER_ERROR is a generic error that should be used for all errors that
   * arise as a result of an internal server error, e.g. a database query failing, a network
   * request failing, buggy code, etc.
   */
  ERR_INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
} as const;

type ErrorCode = (typeof codes)[keyof typeof codes];

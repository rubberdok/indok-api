import { KnownDomainError, errorCodes } from "./errors.js";

export class AlreadySignedUpError extends KnownDomainError {
  constructor(description: string) {
    super("AlreadySignedUpError", description, errorCodes.ERR_BAD_USER_INPUT);
  }
}

export class InvalidCapacityError extends KnownDomainError {
  constructor(description: string) {
    super("InvalidCapacityError", description, errorCodes.ERR_BAD_USER_INPUT);
  }
}

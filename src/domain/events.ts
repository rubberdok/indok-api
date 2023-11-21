import { BaseError, errorCodes } from "./errors.js";

export class AlreadySignedUpError extends BaseError {
  constructor(description: string) {
    super("AlreadySignedUpError", description, errorCodes.ERR_BAD_USER_INPUT);
  }
}

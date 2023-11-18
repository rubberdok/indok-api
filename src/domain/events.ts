import { InvalidArgumentError } from "./errors.js";

export class EventFullError extends InvalidArgumentError {
  constructor() {
    super("Event is full");
  }
}

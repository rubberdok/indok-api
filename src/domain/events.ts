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

export const signUpAvailability = {
  /**
   * UNAVAILABLE means that the user is either not logged in, or there are no slots on the
   * event for the user's grade year, regardless of capacity.
   */
  UNAVAILABLE: "UNAVAILABLE",
  /**
   * AVAILABLE means that the user is logged in, and there are slots available on the event
   * for the user's grade year.
   */
  AVAILABLE: "AVAILABLE",
  /**
   * NOT_OPEN means that sign ups for the event have not opened yet.
   */
  NOT_OPEN: "NOT_OPEN",
  /**
   * CLOSED means that sign ups for the event have closed.
   */
  CLOSED: "CLOSED",
  /**
   * WAITLIST_AVAILABLE means that the user is logged in, and that the slots for the user's grade year
   * are full.
   */
  WAITLIST_AVAILABLE: "WAITLIST_AVAILABLE",
  /**
   * DISABLED means that the event is not accepting sign ups.
   */
  DISABLED: "DISABLED",
  /**
   * CONFIRMED means that the user is signed up for the event.
   */
  CONFIRMED: "CONFIRMED",
  /**
   * ON_WAITLIST means that the user is on the waitlist for the event.
   */
  ON_WAITLIST: "ON_WAITLIST",
} as const;

export type SignUpAvailability =
  (typeof signUpAvailability)[keyof typeof signUpAvailability];

export type BaseEvent = {
  id: string;
  name: string;
  organizationId: string | null;
  description: string;
  location: string;
  contactEmail: string;
  startAt: Date;
  endAt: Date;
  version: number;
  signUpsEnabled: boolean;
};

type EventWithoutSignUps = BaseEvent & {
  signUpsEnabled: false;
  signUpDetails?: never;
};

export type EventWithSignUps = BaseEvent & {
  signUpsEnabled: true;
  signUpDetails: {
    signUpsStartAt: Date;
    signUpsEndAt: Date;
    capacity: number;
    remainingCapacity: number;
  };
};

export type Event = EventWithoutSignUps | EventWithSignUps;

export function isEventWithSignUps(
  event: BaseEvent,
): event is EventWithSignUps {
  return event.signUpsEnabled;
}

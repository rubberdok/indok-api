import type {
	Event as DataStorageEvent,
	EventSlot,
	Product,
} from "@prisma/client";
import { merge } from "lodash-es";
import { DateTime } from "luxon";
import { z } from "zod";
import type { Result } from "~/lib/result.js";
import {
	InternalServerError,
	InvalidArgumentError,
	KnownDomainError,
	errorCodes,
} from "./errors.js";

class AlreadySignedUpError extends KnownDomainError {
	constructor(description: string) {
		super("AlreadySignedUpError", description, errorCodes.ERR_BAD_USER_INPUT);
	}
}

class InvalidCapacityError extends KnownDomainError<"InvalidCapacityError"> {
	constructor(description: string) {
		super("InvalidCapacityError", description, errorCodes.ERR_BAD_USER_INPUT);
	}
}

const signUpAvailability = {
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

type SignUpAvailability =
	(typeof signUpAvailability)[keyof typeof signUpAvailability];

const EventTypes = {
	// Regular event without sign ups
	BASIC: "BASIC",
	// Event with sign ups
	SIGN_UPS: "SIGN_UPS",
	// Event with ticket sales
	TICKETS: "TICKETS",
} as const;

type BaseEventType = {
	name: string;
	organizationId: string;
	description: string;
	location: string;
	contactEmail: string;
	startAt: Date;
	endAt: Date;
	categories?: { id: string }[];
	signUpsEnabled: boolean;
};

interface BasicEvent extends BaseEventType {
	signUpsEnabled: false;
	type: "BASIC";
}

type EventSignUpDetails = {
	signUpsStartAt: Date;
	signUpsEndAt: Date;
	capacity: number;
	remainingCapacity: number;
	slots: SlotType[];
};

interface SignUpEvent extends BaseEventType {
	signUpDetails: EventSignUpDetails;
	type: "SIGN_UPS";
}

interface TicketEvent extends BaseEventType {
	type: "TICKETS";
	signUpDetails: EventSignUpDetails;
	productId: string;
}

type BaseEventTypeFromDSO = {
	id: string;
	version: number;
	name: string;
	organizationId: string;
	description: string;
	location: string;
	contactEmail: string;
	startAt: Date;
	endAt: Date;
	categories: { id: string; name: string }[];
	signUpsEnabled: boolean;
};

type SignUpDetailsFromDSO = {
	signUpsStartAt: Date;
	signUpsEndAt: Date;
	capacity: number;
	remainingCapacity: number;
	slots: SlotTypeFromDSO[];
};

interface BasicEventFromDSO extends BaseEventTypeFromDSO {
	signUpsEnabled: false;
	type: "BASIC";
}

interface SignUpEventFromDSO extends BaseEventTypeFromDSO {
	type: "SIGN_UPS";
	signUpDetails: SignUpDetailsFromDSO;
}

interface TicketEventFromDSO extends BaseEventTypeFromDSO {
	type: "TICKETS";
	signUpDetails: SignUpDetailsFromDSO;
	productId: string;
}

type EventType = BasicEvent | SignUpEvent | TicketEvent;

type EventTypeFromDSO =
	| BasicEventFromDSO
	| SignUpEventFromDSO
	| TicketEventFromDSO;

type Category = {
	id: string;
	name: string;
};

function isSignUpEvent(event: EventType): event is SignUpEvent;
function isSignUpEvent(event: EventTypeFromDSO): event is SignUpEventFromDSO;
function isSignUpEvent(
	event: EventTypeFromDSO | EventType,
): event is SignUpEventFromDSO | SignUpEvent {
	switch (event.type) {
		case EventTypes.BASIC:
			return false;
		case EventTypes.SIGN_UPS:
		case EventTypes.TICKETS:
			return event.signUpsEnabled;
	}
}

type NewBasicEventData = {
	name: string;
	description?: string | null;
	startAt: Date;
	endAt?: Date | null;
	contactEmail?: string | null;
	location?: string | null;
	organizationId: string;
	categories?: { id: string }[];
};

type NewEventSlotType = {
	capacity: number;
	gradeYears?: number[] | null;
};

type NewEventSignUpDetails = {
	signUpsStartAt: Date;
	signUpsEndAt: Date;
	capacity: number;
	slots: NewEventSlotType[];
};

type NewSignUpEventData = NewBasicEventData & {
	signUpsEnabled?: boolean | null;
	signUpDetails: NewEventSignUpDetails;
};

type NewTicketEventData = NewSignUpEventData & {
	productId: string;
};

function newSignUpEvent(signUpEvent: NewSignUpEventData): NewSignUpEventReturn {
	const eventResult = newBasicEvent(signUpEvent);

	if (!eventResult.ok) {
		return {
			ok: false,
			error: new InvalidArgumentError(
				"Could not create event",
				eventResult.error,
			),
		};
	}

	const eventSchema = z
		.object({
			signUpsEnabled: z.boolean(),
			signUpDetails: z.object({
				signUpsEnabled: z.literal(true),
				signUpsStartAt: z.date(),
				signUpsEndAt: z.date(),
				capacity: z.number().int().positive(),
				slots: z.array(
					z.object({
						capacity: z.number().int().positive(),
						gradeYears: z.array(z.number().int().positive()).optional(),
					}),
				),
			}),
		})
		.refine(
			({ signUpDetails }) => {
				return signUpDetails.signUpsStartAt < signUpDetails.signUpsEndAt;
			},
			{
				message: "signUpsStartAt must be before signUpsEndAt",
				path: ["signUpDetails", "signUpsStartAt"],
			},
		);

	const result = eventSchema.safeParse(signUpEvent);
	if (!result.success) {
		return {
			ok: false,
			error: new InvalidArgumentError("Invalid sign up details", result.error),
		};
	}

	const { signUpsEnabled, signUpDetails } = result.data;

	return {
		ok: true,
		data: {
			event: {
				...eventResult.data.event,
				signUpsEnabled,
				signUpDetails: merge({}, signUpDetails, {
					remainingCapacity: signUpDetails.capacity,
					slots: signUpDetails.slots.map((slot) => ({
						id: "",
						remainingCapacity: slot.capacity,
						capacity: slot.capacity,
						gradeYears: slot.gradeYears,
					})),
				}),
				type: EventTypes.SIGN_UPS,
			},
		},
	};
}

function newBasicEvent(BasicEvent: NewBasicEventData): NewBasicEventReturn {
	const schema = z
		.object({
			name: z.string().min(1).max(200),
			description: z.string().max(10_000).default(""),
			startAt: z.date().min(new Date()),
			endAt: z.date().min(new Date()),
			contactEmail: z.string().email(),
			location: z.string().default(""),
			organizationId: z.string().uuid(),
			signUpsEnabled: z.literal(false),
			categories: z.array(z.object({ id: z.string().uuid() })).optional(),
		})
		.refine(
			({ endAt, startAt }) => {
				return endAt > startAt;
			},
			{
				message: "endAt must be after startAt",
				path: ["endAt"],
			},
		);
	const endAtOrDefault =
		BasicEvent.endAt ??
		DateTime.fromJSDate(BasicEvent.startAt).plus({ hours: 2 }).toJSDate();
	const result = schema.safeParse(
		merge({}, BasicEvent, { endAt: endAtOrDefault }),
	);
	if (!result.success) {
		return {
			ok: false,
			error: new InvalidArgumentError(result.error.message),
		};
	}
	const event = result.data;
	return {
		ok: true,
		data: {
			event: {
				...event,
				type: EventTypes.BASIC,
			},
		},
	};
}

function newTicketEvent(ticketEvent: NewTicketEventData): NewTicketEventReturn {
	const signUpEventResult = newSignUpEvent(ticketEvent);
	if (!signUpEventResult.ok) {
		return {
			ok: false,
			error: new InvalidArgumentError(
				"Could not create event with product",
				signUpEventResult.error,
			),
		};
	}

	const withProductSchema = z.object({
		productId: z.string().uuid(),
	});
	const result = withProductSchema.safeParse(ticketEvent);
	if (!result.success) {
		return {
			ok: false,
			error: new InvalidArgumentError("Invalid product data", result.error),
		};
	}

	const { productId } = result.data;
	return {
		ok: true,
		data: {
			event: {
				...signUpEventResult.data.event,
				productId,
				type: EventTypes.TICKETS,
			},
		},
	};
}

type FromDSO<T> = T & { id: string; version: number };

type SlotType = {
	capacity: number;
	remainingCapacity: number;
	gradeYears?: number[];
};

type SlotTypeFromDSO = FromDSO<SlotType>;

type NewSignUpEventParams = {
	type: typeof EventTypes.SIGN_UPS;
	data: NewSignUpEventData;
};
type NewTicketEventParams = {
	type: typeof EventTypes.TICKETS;
	data: NewTicketEventData;
};
type NewBasicEventParams = {
	type: typeof EventTypes.BASIC;
	data: NewBasicEventData;
};
type NewSignUpEventReturn = Result<
	{ event: SignUpEvent },
	InvalidArgumentError
>;
type NewTicketEventReturn = Result<
	{ event: TicketEvent },
	InvalidArgumentError
>;
type NewBasicEventReturn = Result<{ event: BasicEvent }, InvalidArgumentError>;
type NewEventReturnType =
	| NewBasicEventReturn
	| NewTicketEventReturn
	| NewSignUpEventReturn;
type NewEventParams =
	| NewSignUpEventParams
	| NewTicketEventParams
	| NewBasicEventParams;

function newEvent(params: NewBasicEventParams): NewBasicEventReturn;
function newEvent(params: NewTicketEventParams): NewTicketEventReturn;
function newEvent(params: NewSignUpEventParams): NewSignUpEventReturn;
function newEvent({ type, data }: NewEventParams): NewEventReturnType {
	switch (type) {
		case EventTypes.BASIC:
			return newBasicEvent(data);
		case EventTypes.SIGN_UPS:
			return newSignUpEvent(data);
		case EventTypes.TICKETS:
			return newTicketEvent(data);
	}
}

const DELETED_ID = "[DELETED]";

const Event = {
	new: newEvent,
	fromDataStorage(
		event: Readonly<
			DataStorageEvent & {
				categories: { id: string; name: string }[];
				slots: EventSlot[];
				product: Product | null;
			}
		>,
	): Result<{ event: EventTypeFromDSO }, InternalServerError> {
		const organizationId = event.organizationId || DELETED_ID;

		if (event.type === EventTypes.BASIC) {
			return {
				ok: true,
				data: {
					event: {
						...event,
						organizationId,
						type: EventTypes.BASIC,
						signUpsEnabled: false,
					},
				},
			};
		}
		const result = z
			.object({
				signUpsStartAt: z.date(),
				signUpsEndAt: z.date(),
				capacity: z.number().int().positive(),
				remainingCapacity: z.number().int().positive(),
				slots: z.array(
					z.object({
						id: z.string().uuid(),
						capacity: z.number().int().positive(),
						remainingCapacity: z.number().int().positive(),
						gradeYears: z.array(z.number().int().positive()),
						version: z.number().int().positive(),
					}),
				),
			})
			.safeParse(event);

		if (!result.success) {
			return {
				ok: false,
				error: new InternalServerError("Invalid sign up data for event"),
			};
		}
		const signUpDetails = result.data;

		if (event.type === EventTypes.TICKETS) {
			const { product } = event;
			if (product === null) {
				return {
					ok: false,
					error: new InternalServerError("Event is missing product"),
				};
			}
			return {
				ok: true,
				data: {
					event: {
						...event,
						organizationId,
						signUpDetails,
						type: EventTypes.TICKETS,
						product,
					},
				},
			};
		}
		return {
			ok: true,
			data: {
				event: {
					...event,
					organizationId,
					signUpDetails,
					type: EventTypes.SIGN_UPS,
				},
			},
		};
	},
} as const;

export {
	Event,
	AlreadySignedUpError,
	InvalidCapacityError,
	signUpAvailability,
	EventTypes,
	DELETED_ID,
	isSignUpEvent,
};
export type {
	EventType,
	Category,
	EventSignUpDetails,
	SignUpAvailability,
	TicketEvent,
	SignUpEvent,
	BasicEvent,
	NewEventParams,
	NewEventReturnType,
	EventTypeFromDSO,
	BasicEventFromDSO,
	SignUpEventFromDSO,
	TicketEventFromDSO,
};

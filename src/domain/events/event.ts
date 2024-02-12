import { randomUUID } from "crypto";
import type { Event as DataStorageEvent } from "@prisma/client";
import { isNil, merge, omitBy } from "lodash-es";
import { DateTime } from "luxon";
import { z } from "zod";
import type { Result, ResultAsync } from "~/lib/result.js";
import {
	type InternalServerError,
	InvalidArgumentError,
	KnownDomainError,
	errorCodes,
} from "../errors.js";
import type { CategoryType } from "./category.js";
import type { SlotType } from "./slot.js";

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

const EventTypeEnum = {
	// Regular event without sign ups
	BASIC: "BASIC",
	// Event with sign ups
	SIGN_UPS: "SIGN_UPS",
	// Event with ticket sales
	TICKETS: "TICKETS",
} as const;

type EventFields = {
	readonly id: string;
	readonly version: number;
	name: string;
	organizationId: string | null;
	description: string;
	location: string;
	contactEmail: string;
	startAt: Date;
	endAt: Date;
	signUpsEnabled: boolean;
	signUpsStartAt?: Date | null;
	signUpsEndAt?: Date | null;
	capacity?: number | null;
	remainingCapacity?: number | null;
	productId?: string | null;
	type: (typeof EventTypeEnum)[keyof typeof EventTypeEnum];
};

type BasicEvent = EventFields & {
	type: typeof EventTypeEnum.BASIC;
};

type SignUpEvent = EventFields & {
	type: typeof EventTypeEnum.SIGN_UPS;
	signUpsStartAt: Date;
	signUpsEndAt: Date;
	capacity: number;
	remainingCapacity: number;
};

type TicketEvent = EventFields & {
	productId: string;
	type: typeof EventTypeEnum.TICKETS;
	signUpsStartAt: Date;
	signUpsEndAt: Date;
	capacity: number;
	remainingCapacity: number;
};

type EventType = BasicEvent | SignUpEvent | TicketEvent;

function isSignUpEvent(event: EventType): event is SignUpEvent {
	switch (event.type) {
		case EventTypeEnum.BASIC:
			return false;
		case EventTypeEnum.SIGN_UPS:
		case EventTypeEnum.TICKETS:
			return event.signUpsEnabled;
	}
}

type NewBasicEventData = {
	id?: string;
	version?: number;
	name: string;
	description?: string | null;
	startAt: Date;
	endAt?: Date | null;
	contactEmail?: string | null;
	location?: string | null;
	organizationId: string;
	categories?: { id: string }[];
};

type NewSignUpEventData = NewBasicEventData & {
	signUpsEnabled?: boolean | null;
	signUpsStartAt: Date;
	signUpsEndAt: Date;
	capacity: number;
};

type NewTicketEventData = NewSignUpEventData & {
	productId: string;
};

function newSignUpEvent(event: NewSignUpEventData): NewSignUpEventReturn {
	const eventResult = newBasicEvent(event);

	if (!eventResult.ok) {
		return {
			ok: false,
			error: new InvalidArgumentError(
				"Could not create event",
				eventResult.error,
			),
		};
	}
	const { event: basicEvent } = eventResult.data;

	const signUpSchema = z
		.object({
			signUpsEnabled: z.boolean().optional().default(false),
			signUpsStartAt: z.date(),
			signUpsEndAt: z.date(),
			capacity: z.number().int().min(0),
		})
		.refine(
			({ signUpsEndAt, signUpsStartAt }) => {
				return signUpsStartAt < signUpsEndAt;
			},
			{
				message: "signUpsStartAt must be before signUpsEndAt",
				path: ["signUpDetails", "signUpsStartAt"],
			},
		);

	const signUpSchemaResult = signUpSchema.safeParse(event);
	if (!signUpSchemaResult.success) {
		return {
			ok: false,
			error: new InvalidArgumentError(
				"Invalid sign up details",
				signUpSchemaResult.error,
			),
		};
	}

	const { signUpsEnabled, signUpsEndAt, signUpsStartAt, capacity } =
		signUpSchemaResult.data;

	return {
		ok: true,
		data: {
			event: {
				...basicEvent,
				signUpsEndAt,
				signUpsStartAt,
				signUpsEnabled,
				capacity,
				remainingCapacity: capacity,
				type: EventTypeEnum.SIGN_UPS,
			},
		},
	};
}

function newBasicEvent(basicEvent: NewBasicEventData): NewBasicEventReturn {
	const schema = z
		.object({
			id: z.string().uuid().optional(),
			version: z.number().int().min(0).optional(),
			name: z.string().min(1).max(200),
			description: z.string().max(10_000).default(""),
			startAt: z.date().min(new Date()),
			endAt: z.date().min(new Date()),
			contactEmail: z
				.string()
				.email()
				.nullish()
				.transform((val) => val ?? ""),
			location: z.string().default(""),
			organizationId: z.string().uuid(),
			signUpsEnabled: z
				.boolean()
				.nullish()
				.transform((val) => val ?? false),
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
		basicEvent.endAt ??
		DateTime.fromJSDate(basicEvent.startAt).plus({ hours: 2 }).toJSDate();
	const result = schema.safeParse(
		merge({}, basicEvent, { endAt: endAtOrDefault }),
	);
	if (!result.success) {
		return {
			ok: false,
			error: new InvalidArgumentError(result.error.message),
		};
	}
	const { id, version, ...data } = result.data;
	return {
		ok: true,
		data: {
			event: {
				...data,
				id: id ?? randomUUID(),
				version: version ?? 0,
				type: EventTypeEnum.BASIC,
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
				type: EventTypeEnum.TICKETS,
			},
		},
	};
}

type NewSignUpEventParams = {
	type: typeof EventTypeEnum.SIGN_UPS;
	event: NewSignUpEventData;
};
type NewTicketEventParams = {
	type: typeof EventTypeEnum.TICKETS;
	event: NewTicketEventData;
};
type NewBasicEventParams = {
	type: typeof EventTypeEnum.BASIC;
	event: NewBasicEventData;
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
function newEvent({ type, event }: NewEventParams): NewEventReturnType {
	switch (type) {
		case EventTypeEnum.BASIC:
			return newBasicEvent(event);
		case EventTypeEnum.SIGN_UPS:
			return newSignUpEvent(event);
		case EventTypeEnum.TICKETS:
			return newTicketEvent(event);
	}
}

function updateEvent(params: {
	previous: { event: EventType };
	data: {
		event: EventUpdateFields;
	};
}): Result<UpdateEvenFnReturnType> {
	const { previous, data } = params;
	const { startAt, endAt } = data.event;

	if (startAt || endAt) {
		const durationSchema = z
			.object({
				startAt: z.date(),
				endAt: z.date(),
			})
			.refine(({ endAt, startAt }) => {
				return endAt > startAt;
			}, "endAt must be after startAt");
		const durationResult = durationSchema.safeParse(
			merge({}, previous.event, data.event),
		);
		if (!durationResult.success) {
			return {
				ok: false,
				error: new InvalidArgumentError(
					"Invalid start and end date",
					durationResult.error,
				),
			};
		}
	}

	const schema = z.object({
		name: z.string().max(200).min(1).optional(),
		description: z.string().max(10_000).optional(),
		location: z.string().optional(),
		signUpsEnabled: z.boolean().optional(),
		signUpsEndAt: z.date().optional(),
		signUpsStartAt: z.date().optional(),
		capacity: z.number().int().min(0).optional(),
		productId: z.string().uuid().optional(),
		contactEmail: z.string().email().optional(),
	});

	const updatedFields = omitBy(data.event, isNil);
	const result = schema.safeParse(updatedFields);
	if (!result.success) {
		return {
			ok: false,
			error: new InvalidArgumentError(
				"Invalid event update data",
				result.error,
			),
		};
	}
	const validatedUpdateFields = result.data;
	const { event: previousEvent } = previous;
	switch (previousEvent.type) {
		case EventTypeEnum.BASIC:
			return {
				ok: true,
				data: {
					event: {
						...previousEvent,
						...validatedUpdateFields,
					},
				},
			};
		case EventTypeEnum.SIGN_UPS:
		case EventTypeEnum.TICKETS:
			return updateSignUpEvent({
				previous: {
					event: previousEvent,
				},
				data: { event: validatedUpdateFields },
			});
	}
}

type EventUpdateFields = Partial<{
	name: string | null;
	description: string | null;
	startAt: Date | null;
	endAt: Date | null;
	location: string | null;
	signUpsEnabled: boolean | null;
	capacity: number | null;
	signUpsStartAt: Date | null;
	signUpsEndAt: Date | null;
	contactEmail: string | null;
}>;

function updateSignUpEvent(params: {
	previous: { event: SignUpEvent | TicketEvent };
	data: { event: EventUpdateFields };
}): Result<
	UpdateEvenFnReturnType,
	InvalidCapacityError | InvalidArgumentError
> {
	const { previous, data } = params;
	const newEvent = previous.event;

	if (data.event.signUpsEndAt || data.event.signUpsStartAt) {
		const durationSchema = z
			.object({
				signUpsStartAt: z.date(),
				signUpsEndAt: z.date(),
			})
			.refine(
				({ signUpsEndAt, signUpsStartAt }) => {
					return signUpsStartAt < signUpsEndAt;
				},
				{
					message: "signUpsStartAt must be before signUpsEndAt",
					path: ["signUpsStartAt"],
				},
			);
		const durationResult = durationSchema.safeParse(
			merge({}, previous.event, data.event),
		);
		if (!durationResult.success) {
			return {
				ok: false,
				error: new InvalidArgumentError(
					"Invalid sign up start and end date",
					durationResult.error,
				),
			};
		}
	}

	const schema = z.object({
		signUpsEnabled: z.boolean().optional(),
		signUpsEndAt: z.date().optional(),
		signUpsStartAt: z.date().optional(),
		capacity: z.number().int().min(0).optional(),
	});

	const updatedFields = omitBy(data.event, isNil);
	const result = schema.safeParse(updatedFields);
	if (!result.success) {
		return {
			ok: false,
			error: new InvalidArgumentError(
				"Invalid event update data",
				result.error,
			),
		};
	}
	const validatedUpdateFields = result.data;
	if (validatedUpdateFields.capacity !== undefined) {
		const changeInCapacity =
			validatedUpdateFields.capacity - previous.event.capacity;
		const newRemainingCapacity =
			previous.event.remainingCapacity + changeInCapacity;

		if (newRemainingCapacity < 0) {
			return {
				ok: false,
				error: new InvalidArgumentError(
					"New capacity would result in negative remaining capacity",
				),
			};
		}
		newEvent.capacity = validatedUpdateFields.capacity;
		newEvent.remainingCapacity = newRemainingCapacity;
	}

	return {
		ok: true,
		data: {
			event: {
				...newEvent,
				...validatedUpdateFields,
			},
		},
	};
}

/**
 * areSignUpsAvailable returns true if sign ups are available for the event, i.e.
 * if sign ups are enabled, and the current time is between the start and end date for sign ups.
 */
function areSignUpsAvailable(
	event: EventType,
): event is SignUpEvent | TicketEvent {
	if (event.type === EventTypeEnum.BASIC) return false;
	if (!event.signUpsEnabled) return false;
	if (event.signUpsStartAt > DateTime.now().toJSDate()) return false;
	if (event.signUpsEndAt < DateTime.now().toJSDate()) return false;
	return true;
}

const Event = {
	new: newEvent,
	update: updateEvent,
	areSignUpsAvailable,
	isSignUpEvent,
	fromDataStorage(
		event: DataStorageEvent,
	): Result<{ event: EventType }, InternalServerError> {
		if (event.type === EventTypeEnum.BASIC) {
			return {
				ok: true,
				data: {
					event: {
						...event,
						type: EventTypeEnum.BASIC,
					},
				},
			};
		}

		const result = z
			.object({
				signUpsStartAt: z.date(),
				signUpsEndAt: z.date(),
				capacity: z.number().int().min(0),
				remainingCapacity: z.number().int().min(0),
			})
			.safeParse(event);

		if (!result.success) {
			return {
				ok: true,
				data: {
					event: {
						...event,
						type: EventTypeEnum.BASIC,
					},
				},
			};
		}
		const signUpDetails = result.data;

		if (event.type === EventTypeEnum.TICKETS) {
			const { productId } = event;
			if (productId === null) {
				return {
					ok: true,
					data: {
						event: {
							...event,
							type: EventTypeEnum.BASIC,
						},
					},
				};
			}
			return {
				ok: true,
				data: {
					event: {
						...event,
						...signUpDetails,
						type: EventTypeEnum.TICKETS,
						productId,
					},
				},
			};
		}
		return {
			ok: true,
			data: {
				event: {
					...event,
					...signUpDetails,
					type: EventTypeEnum.SIGN_UPS,
				},
			},
		};
	},
} as const;

type UpdateEvenFnReturnType = {
	event: EventType;
	slots?: {
		update?: SlotType[];
		create?: SlotType[];
		delete?: SlotType[];
	};
	categories?: { id: string }[];
};
type EventUpdateFn<
	T extends EventType = EventType,
	TError extends KnownDomainError = KnownDomainError,
> = (params: {
	event: T;
	slots?: SlotType[];
	categories?: CategoryType[];
}) => ResultAsync<UpdateEvenFnReturnType, TError>;

export { Event, AlreadySignedUpError, InvalidCapacityError, EventTypeEnum };
export type {
	EventType,
	TicketEvent,
	SignUpEvent,
	BasicEvent,
	NewEventParams,
	NewEventReturnType,
	EventUpdateFn,
	EventUpdateFields,
};

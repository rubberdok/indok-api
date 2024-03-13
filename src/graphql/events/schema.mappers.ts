import type {
	EventType as EventMapper,
	EventType,
} from "~/domain/events/event.js";

interface EventsResponseMapper {
	events: EventMapper[];
}

type SignUpsMapper = EventType;

interface EventUserMapper {
	id: string;
	eventId: string;
}

type EventTicketInformationMapper = EventType;

export type {
	EventMapper,
	EventsResponseMapper,
	EventUserMapper,
	EventTicketInformationMapper,
	SignUpsMapper,
};
export type { EventSignUp as SignUpMapper } from "@prisma/client";

import type { EventType } from "~/domain/events/index.js";

interface EventsResponseMapper {
	events: EventType[];
}

interface EventUserMapper {
	id: string;
	eventId: string;
}

export type {
	EventType as EventMapper,
	EventType as EventTicketInformationMapper,
	EventSignUp as SignUpMapper,
	EventType as SignUpsMapper,
} from "~/domain/events/index.js";

export type { EventsResponseMapper, EventUserMapper };

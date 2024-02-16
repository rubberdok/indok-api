import {
	EventType as EventMapper,
	type EventType,
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

export {
	EventMapper,
	type EventsResponseMapper,
	type EventUserMapper,
	type EventTicketInformationMapper,
	type SignUpsMapper,
};
export { EventSignUp as SignUpMapper } from "@prisma/client";

import { EventType as EventMapper } from "~/domain/events/event.js";

interface EventsResponseMapper {
	events: EventMapper[];
}

interface EventUserMapper {
	id: string;
	eventId: string;
}

export { EventMapper, type EventsResponseMapper, type EventUserMapper };
export { EventSignUp as SignUpMapper } from "@prisma/client";

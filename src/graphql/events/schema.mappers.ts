import { EventType as EventMapper } from "~/domain/events/event.js";

interface EventsResponseMapper {
	events: EventMapper[];
}

export { EventMapper, type EventsResponseMapper };
export { EventSignUp as SignUpMapper } from "@prisma/client";

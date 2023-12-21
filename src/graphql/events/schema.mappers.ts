import { BaseEvent as EventMapper } from "~/domain/events.js";

interface EventsResponseMapper {
	events: EventMapper[];
}

export { EventMapper, EventsResponseMapper };
export { EventSignUp as SignUpMapper } from "@prisma/client";

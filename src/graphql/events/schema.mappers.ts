import { EventTypeFromDSO as EventMapper } from "~/domain/events.js";

interface EventsResponseMapper {
	events: EventMapper[];
}

export { EventMapper, type EventsResponseMapper };
export { EventSignUp as SignUpMapper } from "@prisma/client";

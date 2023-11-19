import { Event as EventMapper } from "@prisma/client";

interface EventsResponseMapper {
  events: EventMapper[];
}

export { EventMapper, EventsResponseMapper };

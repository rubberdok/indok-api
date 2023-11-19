import type { EventsResponseResolvers } from "./../../types.generated.js";
export const EventsResponse: EventsResponseResolvers = {
  /* Implement EventsResponse resolver logic here */
  total: ({ events }) => {
    return events.length;
  },
};

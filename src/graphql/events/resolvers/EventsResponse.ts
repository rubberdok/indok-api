import { DateTime } from "luxon";

import type { EventsResponseResolvers } from "./../../types.generated.js";
export const EventsResponse: EventsResponseResolvers = {
  /* Implement EventsResponse resolver logic here */
  total: ({ events }) => {
    return events.length;
  },
  thisWeek: ({ events }) => {
    const now = DateTime.now().startOf("week");
    const predicate = (startAt: Date) => {
      const startAtDateTime = DateTime.fromJSDate(startAt);
      return startAtDateTime.weekNumber == now.weekNumber;
    };
    return events.filter((event) => predicate(event.startAt));
  },
  nextWeek: ({ events }) => {
    const nextWeek = DateTime.now().startOf("week").plus({ weeks: 1 });
    const predicate = (startAt: Date) => {
      const startAtDateTime = DateTime.fromJSDate(startAt);
      return startAtDateTime.weekNumber == nextWeek.weekNumber;
    };
    return events.filter((event) => predicate(event.startAt));
  },
  twoWeeksOrLater: ({ events }) => {
    const twoWeeksAhead = DateTime.now().startOf("week").plus({ week: 2 });
    const predicate = (startAt: Date) => {
      const startAtDateTime = DateTime.fromJSDate(startAt);
      return startAtDateTime.weekNumber >= twoWeeksAhead.weekNumber;
    };
    return events.filter((event) => predicate(event.startAt));
  },
};

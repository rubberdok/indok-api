import { DateTime } from "luxon";
import type { EventsResponseResolvers } from "./../../types.generated.js";
export const EventsResponse: EventsResponseResolvers = {
  /* Implement EventsResponse resolver logic here */
  total: ({ events }) => {
    return events.length;
  },
  thisWeek: ({ events }) => {
    const startOfWeek = DateTime.now().startOf("week");
    const endOfWeek = DateTime.now().endOf("week");
    const predicate = (startAt: Date) => {
      const startAtDateTime = DateTime.fromJSDate(startAt);
      return startOfWeek <= startAtDateTime && startAtDateTime <= endOfWeek;
    };
    return events.filter((event) => predicate(event.startAt));
  },
  nextWeek: ({ events }) => {
    const startOfNextWeek = DateTime.now().plus({ weeks: 1 }).startOf("week");
    const endOfNextWeek = DateTime.now().plus({ weeks: 1 }).endOf("week");
    const predicate = (startAt: Date) => {
      const startAtDateTime = DateTime.fromJSDate(startAt);
      return (
        startOfNextWeek <= startAtDateTime && startAtDateTime <= endOfNextWeek
      );
    };
    return events.filter((event) => predicate(event.startAt));
  },
  twoWeeksOrLater: ({ events }) => {
    const twoWeeksAhead = DateTime.now().plus({ week: 2 }).startOf("week");
    const predicate = (startAt: Date) => {
      const startAtDateTime = DateTime.fromJSDate(startAt);
      return twoWeeksAhead <= startAtDateTime;
    };
    return events.filter((event) => predicate(event.startAt));
  },
};

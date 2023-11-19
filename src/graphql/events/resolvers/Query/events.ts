import type { QueryResolvers } from "./../../../types.generated.js";

export const events: NonNullable<QueryResolvers["events"]> = async (_parent, { data }, { eventService }) => {
  if (!data) {
    const events = await eventService.findMany();
    return { events };
  }

  const filter: Parameters<typeof eventService.findMany>[0] = {
    onlyFutureEvents: data.futureEventsOnly,
  };

  const events = await eventService.findMany(filter);
  return { events };
};

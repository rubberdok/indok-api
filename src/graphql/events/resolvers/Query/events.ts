import type { QueryResolvers } from "./../../../types.generated.js";
export const events: NonNullable<QueryResolvers["events"]> = async (_parent, _arg, { eventService }) => {
  const events = await eventService.findMany();
  return { events };
};

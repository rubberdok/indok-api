import type { MutationResolvers } from "./../../../types.generated.js";
export const newBooking: NonNullable<MutationResolvers["newBooking"]> = async (_parent, { data }, ctx) => {
  return await ctx.cabinService.newBooking(data);
};

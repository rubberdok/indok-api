import type { QueryResolvers } from "./../../../types.generated.js";
export const bookingContact: NonNullable<QueryResolvers["bookingContact"]> = async (_parent, _arg, ctx) => {
  const bookingContact = await ctx.cabinService.getBookingContact();
  return { bookingContact };
};

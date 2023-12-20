import type { BookingResolvers } from "./../../types.generated.js";
export const Booking: BookingResolvers = {
  cabin: (parent, _arg, ctx) => {
    return ctx.cabinService.getCabin(parent.cabinId);
  },
};

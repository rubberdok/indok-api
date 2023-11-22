import { assertIsAuthenticated } from "@/graphql/auth.js";

import type { MutationResolvers } from "./../../../types.generated.js";
export const updateBookingContact: NonNullable<MutationResolvers["updateBookingContact"]> = async (
  _parent,
  { data },
  ctx
) => {
  assertIsAuthenticated(ctx);

  const { name, email, phoneNumber } = data;
  const bookingContact = await ctx.cabinService.updateBookingContact(ctx.req.session.userId, {
    name,
    email,
    phoneNumber,
  });

  return {
    bookingContact,
  };
};

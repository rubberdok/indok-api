import { assertIsAuthenticated } from "@/graphql/auth.js";

import type { MutationResolvers } from "./../../../types.generated.js";
export const updateBookingStatus: NonNullable<MutationResolvers["updateBookingStatus"]> = async (
  _parent,
  { data },
  ctx
) => {
  assertIsAuthenticated(ctx);
  const { id, status } = data;
  const booking = await ctx.cabinService.updateBookingStatus(ctx.req.session.userId, id, status);
  return { booking };
};

import type { MutationResolvers } from "./../../../types.generated.js";
export const updateBookingStatus: NonNullable<MutationResolvers["updateBookingStatus"]> = async (
  _parent,
  { data },
  ctx
) => {
  const { id, status } = data;
  return await ctx.cabinService.updateBookingStatus(id, status);
};

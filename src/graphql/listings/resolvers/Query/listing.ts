import type { QueryResolvers } from "./../../../types.generated.js";
export const listing: NonNullable<QueryResolvers["listing"]> = async (
  _parent,
  { data },
  ctx,
) => {
  const listing = await ctx.listingService.get(data.id);
  return { listing };
};

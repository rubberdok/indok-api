import { assertIsAuthenticated } from "@/graphql/auth.js";

import type { MutationResolvers } from "./../../../types.generated.js";
export const createListing: NonNullable<MutationResolvers["createListing"]> = async (_parent, { data }, ctx) => {
  assertIsAuthenticated(ctx);
  const { organizationId, closesAt, ...rest } = data;
  const listing = await ctx.listingService.create(ctx.req.session.userId, organizationId, {
    closesAt: new Date(closesAt),
    ...rest,
  });
  return { listing };
};

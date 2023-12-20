import { assertIsAuthenticated } from "~/graphql/auth.js";
import type { MutationResolvers } from "./../../../types.generated.js";
export const updateListing: NonNullable<MutationResolvers["updateListing"]> =
  async (_parent, { id, data }, ctx) => {
    assertIsAuthenticated(ctx);
    const { closesAt: rawClosesAt, ...rest } = data;
    let closesAt: Date | undefined;
    if (rawClosesAt) closesAt = new Date(rawClosesAt);
    const listing = await ctx.listingService.update(ctx.user.id, id, {
      closesAt,
      ...rest,
    });
    return { listing };
  };

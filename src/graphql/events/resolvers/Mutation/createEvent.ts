import { assertIsAuthenticated } from "~/graphql/auth.js";
import type { MutationResolvers } from "./../../../types.generated.js";
export const createEvent: NonNullable<MutationResolvers["createEvent"]> = async (_parent, { data }, ctx) => {
  assertIsAuthenticated(ctx);

  const {
    organizationId,
    event: { name, description, startAt, endAt },
    signUpDetails,
  } = data;
  if (signUpDetails) {
    const event = await ctx.eventService.create(
      ctx.user.id,
      organizationId,
      {
        name,
        description,
        startAt: new Date(startAt),
        endAt: endAt ? new Date(endAt) : undefined,
      },
      {
        signUpsEndAt: new Date(signUpDetails.signUpsEndAt),
        signUpsStartAt: new Date(signUpDetails.signUpsStartAt),
        capacity: signUpDetails.capacity,
        slots: signUpDetails.slots,
        signUpsEnabled: signUpDetails.enabled,
      },
    );
    return { event };
  }
  const event = await ctx.eventService.create(ctx.user.id, organizationId, {
    name,
    description,
    startAt: new Date(startAt),
    endAt: endAt ? new Date(endAt) : undefined,
  });

  return { event };
};

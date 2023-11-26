import { assertIsAuthenticated } from "@/graphql/auth.js";

import type { MutationResolvers } from "./../../../types.generated.js";
export const createEvent: NonNullable<MutationResolvers["createEvent"]> = async (_parent, { data }, ctx) => {
  assertIsAuthenticated(ctx);

  const { name, description, startAt: rawStartAt, endAt: rawEndAt, organizationId, slots, capacity } = data;
  let startAt: Date;
  if (typeof rawStartAt === "string") {
    startAt = new Date(rawStartAt);
  } else {
    startAt = rawStartAt;
  }

  let endAt: Date | null | undefined;
  if (typeof rawEndAt === "string") {
    endAt = new Date(rawEndAt);
  } else {
    endAt = rawEndAt;
  }

  const event = await ctx.eventService.create(ctx.user.id, organizationId, {
    name,
    description,
    startAt,
    endAt,
    slots,
    capacity,
  });
  return { event };
};

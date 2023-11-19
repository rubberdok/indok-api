import { assertIsAuthenticated } from "@/graphql/auth.js";

import type { MutationResolvers } from "./../../../types.generated.js";
export const createEvent: NonNullable<MutationResolvers["createEvent"]> = async (_parent, { data }, ctx) => {
  assertIsAuthenticated(ctx);

  const { name, description, startAt: rawStartAt, endAt: rawEndAt, organizationId, slots, spots } = data;
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

  const event = await ctx.eventService.create(ctx.req.session.userId, organizationId, {
    name,
    description,
    startAt,
    endAt,
    slots,
    spots,
  });
  return { event };
};

import { assertIsAuthenticated } from "~/graphql/auth.js";
import type { MutationResolvers } from "./../../../types.generated.js";
export const updateEvent: NonNullable<MutationResolvers["updateEvent"]> =
  async (_parent, { data, id }, ctx) => {
    assertIsAuthenticated(ctx);
    const { name, description, startAt, endAt, location, capacity } = data;
    const event = await ctx.eventService.update(ctx.user.id, id, {
      name,
      description,
      startAt: typeof startAt === "string" ? new Date(startAt) : startAt,
      endAt: typeof endAt === "string" ? new Date(endAt) : endAt,
      location,
      capacity,
    });
    return {
      event,
    };
  };

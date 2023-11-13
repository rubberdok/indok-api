import { BadRequestError, InternalServerError } from "@/domain/errors.js";

import type { MutationResolvers } from "./../../../types.generated.js";
export const logout: NonNullable<MutationResolvers["logout"]> = async (_parent, _arg, ctx) => {
  if (!ctx.req.session.authenticated) {
    throw new BadRequestError("User is not authenticated");
  }
  try {
    await ctx.req.session.destroy();
  } catch (err) {
    ctx.req.log.error(err, "Failed to destroy session");
    throw new InternalServerError("Failed to destroy session");
  }

  return {
    status: "SUCCESS",
  };
};

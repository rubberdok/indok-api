import { AuthenticationError } from "@/domain/errors.js";
import { assertIsAuthenticated } from "@/graphql/auth.js";

import type { EventResolvers } from "./../../types.generated.js";
export const Event: EventResolvers = {
  /* Implement Event resolver logic here */
  canSignUp: (parent, _args, ctx) => {
    try {
      assertIsAuthenticated(ctx);
      const canSignUp = ctx.eventService.canSignUpForEvent(ctx.user.id, parent.id);
      return canSignUp;
    } catch (err) {
      if (err instanceof AuthenticationError) return false;
      throw err;
    }
  },
};

import type { UserResolvers } from "./../../types.generated.js";
export const User: UserResolvers = {
  /* Implement User resolver logic here */
  canUpdateYear: (user, _args, ctx) => {
    return ctx.userService.canUpdateYear(user);
  },
  organizations: (user, _args, ctx) => {
    return ctx.organizationService.findMany({ userId: user.id });
  },
};

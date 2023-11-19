import type { MemberResolvers } from "./../../types.generated.js";
export const Member: MemberResolvers = {
  /* Implement Member resolver logic here */
  organization: (parent, _args, ctx) => {
    return ctx.organizationService.get(parent.organizationId);
  },
  user: (parent, _args, ctx) => {
    return ctx.userService.get(parent.userId);
  },
};
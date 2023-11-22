import { assertIsAuthenticated } from "@/graphql/auth.js";

import type { UsersResponseResolvers } from "./../../types.generated.js";
export const UsersResponse: UsersResponseResolvers = {
  /* Implement UsersResponse resolver logic here */
  total: ({ users }) => {
    return users.length;
  },
  super: async ({ users }, _args, ctx) => {
    assertIsAuthenticated(ctx);
    const { isSuperUser } = await ctx.permissionService.isSuperUser(ctx.req.session.userId);
    if (isSuperUser) {
      return users;
    }
    return [];
  },
};

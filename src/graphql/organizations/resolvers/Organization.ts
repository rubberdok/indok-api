import { assertIsAuthenticated } from "@/graphql/auth.js";

import type { OrganizationResolvers } from "./../../types.generated.js";
export const Organization: OrganizationResolvers = {
  /* Implement Organization resolver logic here */
  members: async (parent, _args, ctx) => {
    assertIsAuthenticated(ctx);
    return await ctx.organizationService.getMembers(ctx.req.session.userId, parent.id);
  },
};

import { assertIsAuthenticated } from "@/graphql/auth.js";

import type { MutationResolvers } from "./../../../types.generated.js";
export const createOrganization: NonNullable<MutationResolvers["createOrganization"]> = async (
  _parent,
  { data },
  ctx
) => {
  assertIsAuthenticated(ctx);
  const { userId } = ctx.req.session;

  const { name, description, featurePermissions } = data;
  const organization = await ctx.organizationService.create({
    name,
    description,
    userId,
    featurePermissions,
  });
  return {
    organization,
  };
};

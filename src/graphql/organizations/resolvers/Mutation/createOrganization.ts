import { assertIsAuthenticated } from "@/graphql/auth.js";
import type { MutationResolvers } from "./../../../types.generated.js";
export const createOrganization: NonNullable<MutationResolvers["createOrganization"]> = async (
  _parent,
  { data },
  ctx
) => {
  assertIsAuthenticated(ctx);
  const { userId } = ctx.req.session;

  let organization;
  const { name, description } = data;
  if (description === null) {
    organization = await ctx.organizationService.create({
      name,
      userId,
    });
  } else {
    organization = await ctx.organizationService.create({
      name,
      description,
      userId,
    });
  }
  return {
    organization,
  };
};

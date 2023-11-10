import { assertIsAuthenticated } from "@/graphql/auth.js";
import type { MutationResolvers } from "./../../../types.generated.js";
export const updateOrganization: NonNullable<MutationResolvers["updateOrganization"]> = async (
  _parent,
  { data },
  ctx
) => {
  assertIsAuthenticated(ctx);
  const { userId } = ctx.req.session;

  const { id, name, description } = data;
  const newName = name === null ? undefined : name;
  const newDescription = description === null ? undefined : description;
  const organization = await ctx.organizationService.update(userId, id, {
    name: newName,
    description: newDescription,
  });
  return { organization };
};

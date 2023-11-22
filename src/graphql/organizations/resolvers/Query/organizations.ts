import type { QueryResolvers } from "./../../../types.generated.js";
export const organizations: NonNullable<QueryResolvers["organizations"]> = async (_parent, _arg, ctx) => {
  const organizations = await ctx.organizationService.findMany();
  return { organizations };
};

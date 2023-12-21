import { assertIsAuthenticated } from "~/graphql/auth.js";
import type { MutationResolvers } from "./../../../types.generated.js";
export const updateUser: NonNullable<MutationResolvers["updateUser"]> = async (_parent, { data }, ctx) => {
  assertIsAuthenticated(ctx);

  const user = await ctx.userService.update(ctx.user.id, {
    firstName: data.firstName,
    lastName: data.lastName,
    allergies: data.allergies ?? undefined,
    phoneNumber: data.phoneNumber ?? undefined,
    graduationYear: data.graduationYear,
  });
  return { user };
};

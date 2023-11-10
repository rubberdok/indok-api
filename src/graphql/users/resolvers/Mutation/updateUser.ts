import type { MutationResolvers } from "./../../../types.generated.js";
export const updateUser: NonNullable<MutationResolvers["updateUser"]> = async (_parent, { id, data }, ctx) => {
  return ctx.userService.update(id, {
    firstName: data.firstName,
    lastName: data.lastName,
    allergies: data.allergies ?? undefined,
    phoneNumber: data.phoneNumber ?? undefined,
    graduationYear: data.graduationYear,
  });
};

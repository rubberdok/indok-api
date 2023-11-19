import type { MutationResolvers } from "./../../../types.generated.js";
export const newBooking: NonNullable<MutationResolvers["newBooking"]> = async (_parent, { data }, ctx) => {
  const { cabinId, startDate: rawStartDate, endDate: rawEndDate, email, firstName, lastName, phoneNumber } = data;

  const startDate = new Date(rawStartDate);
  const endDate = new Date(rawEndDate);

  return await ctx.cabinService.newBooking({
    cabinId,
    startDate,
    endDate,
    email,
    firstName,
    lastName,
    phoneNumber,
  });
};

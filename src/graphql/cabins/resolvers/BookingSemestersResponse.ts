import { Semester } from "@prisma/client";

import type { BookingSemestersResponseResolvers } from "./../../types.generated.js";
export const BookingSemestersResponse: BookingSemestersResponseResolvers = {
  /* Implement BookingSemestersResponse resolver logic here */
  autumn: async (_parent, _args, ctx) => {
    return await ctx.cabinService.getBookingSemester(Semester.AUTUMN);
  },
  spring: async (_parent, _args, ctx) => {
    return await ctx.cabinService.getBookingSemester(Semester.SPRING);
  },
};

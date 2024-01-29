import { Semester } from "@prisma/client";
import type { BookingSemestersResponseResolvers } from "./../../types.generated.js";
export const BookingSemestersResponse: BookingSemestersResponseResolvers = {
	/* Implement BookingSemestersResponse resolver logic here */
	fall: async (_parent, _args, ctx) => {
		return await ctx.cabins.getBookingSemester(Semester.FALL);
	},
	spring: async (_parent, _args, ctx) => {
		return await ctx.cabins.getBookingSemester(Semester.SPRING);
	},
};

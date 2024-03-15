import { BookingSemesterEnum } from "~/domain/cabins.js";
import type { BookingSemestersResponseResolvers } from "./../../types.generated.js";
export const BookingSemestersResponse: BookingSemestersResponseResolvers = {
	/* Implement BookingSemestersResponse resolver logic here */
	fall: async (_parent, _args, ctx) => {
		return await ctx.cabins.getBookingSemester(BookingSemesterEnum.FALL);
	},
	spring: async (_parent, _args, ctx) => {
		return await ctx.cabins.getBookingSemester(BookingSemesterEnum.SPRING);
	},
};

import type { UsersResponseResolvers } from "./../../types.generated.js";
export const UsersResponse: UsersResponseResolvers = {
	/* Implement UsersResponse resolver logic here */
	total: ({ users }) => {
		return users.length;
	},
	super: ({ users }, _args, ctx) => {
		if (ctx.user === null) {
			return [];
		}
		const { isSuperUser } = ctx.user;
		if (isSuperUser === true) {
			return users;
		}
		return [];
	},
};

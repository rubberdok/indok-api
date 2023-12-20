import type { PrivateUserResolvers } from "./../../types.generated.js";
export const PrivateUser: PrivateUserResolvers = {
	/* Implement PrivateUser resolver logic here */
	organizations: (user, _args, ctx) => {
		return ctx.organizationService.findMany({ userId: user.id });
	},
};

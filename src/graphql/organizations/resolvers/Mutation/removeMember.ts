import { assertIsAuthenticated } from "~/graphql/auth.js";
import type { MutationResolvers } from "./../../../types.generated.js";
export const removeMember: NonNullable<MutationResolvers['removeMember']> =
	async (_parent, { data }, ctx) => {
		assertIsAuthenticated(ctx);
		const userId = ctx.user.id;

		const member = await ctx.organizations.removeMember(userId, data);
		return { member };
	};

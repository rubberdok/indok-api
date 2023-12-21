import { assertIsAuthenticated } from "~/graphql/auth.js";
import type { MutationResolvers } from "./../../../types.generated.js";
export const removeMember: NonNullable<MutationResolvers["removeMember"]> =
	async (_parent, { data }, ctx) => {
		assertIsAuthenticated(ctx);
		const { userId } = ctx.req.session;

		const member = await ctx.organizationService.removeMember(userId, data);
		return { member };
	};

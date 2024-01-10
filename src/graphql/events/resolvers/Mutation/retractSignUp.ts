import { assertIsAuthenticated } from "~/graphql/auth.js";
import type { MutationResolvers } from "./../../../types.generated.js";
export const retractSignUp: NonNullable<MutationResolvers['retractSignUp']> =
	async (_parent, { data }, ctx) => {
		assertIsAuthenticated(ctx);

		const signUp = await ctx.events.retractSignUp(ctx.user.id, data.eventId);
		return { signUp };
	};

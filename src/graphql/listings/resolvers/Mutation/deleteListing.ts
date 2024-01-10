import { assertIsAuthenticated } from "~/graphql/auth.js";
import type { MutationResolvers } from "./../../../types.generated.js";
export const deleteListing: NonNullable<MutationResolvers['deleteListing']> =
	async (_parent, { data }, ctx) => {
		assertIsAuthenticated(ctx);
		const { id } = data;

		const listing = await ctx.listings.delete(ctx.user.id, id);
		return { listing };
	};

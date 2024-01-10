import { assertIsAuthenticated } from "~/graphql/auth.js";
import type { MutationResolvers } from "./../../../types.generated.js";
export const superUpdateUser: NonNullable<MutationResolvers['superUpdateUser']> = async (_parent, { id, data }, ctx) => {
	assertIsAuthenticated(ctx);

	const user = await ctx.users.superUpdateUser(ctx, id, {
		firstName: data.firstName,
		lastName: data.lastName,
		allergies: data.allergies ?? undefined,
		phoneNumber: data.phoneNumber ?? undefined,
		graduationYear: data.graduationYear,
		isSuperUser: data.isSuperUser,
	});

	return { user };
};

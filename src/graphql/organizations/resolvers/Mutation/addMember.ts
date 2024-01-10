import { Role } from "~/domain/organizations.js";
import { assertIsAuthenticated } from "~/graphql/auth.js";
import type { MutationResolvers } from "./../../../types.generated.js";
export const addMember: NonNullable<MutationResolvers['addMember']> = async (
	_parent,
	{ data },
	ctx,
) => {
	assertIsAuthenticated(ctx);
	const userId = ctx.user.id;

	const { userId: memberId, organizationId, role } = data;
	const member = await ctx.organizations.addMember(userId, {
		userId: memberId,
		organizationId,
		role: role ?? Role.MEMBER,
	});
	return { member };
};

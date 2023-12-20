import { Role } from "~/domain/organizations.js";
import { assertIsAuthenticated } from "~/graphql/auth.js";
import type { MutationResolvers } from "./../../../types.generated.js";
export const addMember: NonNullable<MutationResolvers["addMember"]> = async (
	_parent,
	{ data },
	ctx,
) => {
	assertIsAuthenticated(ctx);
	const { userId } = ctx.req.session;

	const { userId: memberId, organizationId, role } = data;
	const member = await ctx.organizationService.addMember(userId, {
		userId: memberId,
		organizationId,
		role: role ?? Role.MEMBER,
	});
	return { member };
};

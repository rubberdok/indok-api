import { Role } from "~/domain/organizations.js";
import type { MutationResolvers } from "./../../../types.generated.js";
export const addMember: NonNullable<MutationResolvers["addMember"]> = async (
	_parent,
	{ data },
	ctx,
) => {
	const { userId: memberId, organizationId, role } = data;
	const addMemberResult = await ctx.organizations.addMember(ctx, {
		userId: memberId,
		organizationId,
		role: role ?? Role.MEMBER,
	});
	if (!addMemberResult.ok) {
		switch (addMemberResult.error.name) {
			case "PermissionDeniedError":
			case "UnauthorizedError":
				throw addMemberResult.error;
		}
	}
	const { member } = addMemberResult.data;
	return { member };
};

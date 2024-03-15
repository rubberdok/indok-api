import { ApolloServerErrorCode } from "@apollo/server/errors";
import { GraphQLError } from "graphql";
import { OrganizationRole } from "~/domain/organizations.js";
import type { MutationResolvers } from "./../../../types.generated.js";
export const addMember: NonNullable<MutationResolvers["addMember"]> = async (
	_parent,
	{ data },
	ctx,
) => {
	const { userId, email, organizationId, role } = data;
	let addMemberResult: Awaited<
		ReturnType<typeof ctx.organizations.members.addMember>
	>;
	if (userId) {
		addMemberResult = await ctx.organizations.members.addMember(ctx, {
			userId,
			organizationId,
			role: role ?? OrganizationRole.MEMBER,
		});
	} else if (email) {
		addMemberResult = await ctx.organizations.members.addMember(ctx, {
			email,
			organizationId,
			role: role ?? OrganizationRole.MEMBER,
		});
	} else {
		throw new GraphQLError("You must provide either a userId or an email.", {
			extensions: {
				code: ApolloServerErrorCode.BAD_USER_INPUT,
			},
		});
	}

	if (!addMemberResult.ok) throw addMemberResult.error;
	const { member } = addMemberResult.data;
	return { member };
};

import { assertIsAuthenticated } from "~/graphql/auth.js";
import type { MutationResolvers } from "./../../../types.generated.js";
export const createOrganization: NonNullable<
	MutationResolvers["createOrganization"]
> = async (_parent, { data }, ctx) => {
	assertIsAuthenticated(ctx);
	const userId = ctx.user.id;

	const { name, description, featurePermissions } = data;
	ctx.log.info(
		{ name, description, featurePermissions },
		"Creating organization",
	);
	const organization = await ctx.organizations.create(userId, {
		name,
		description,
		featurePermissions,
	});
	return {
		organization,
	};
};

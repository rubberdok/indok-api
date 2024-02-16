import type { MutationResolvers } from "./../../../types.generated.js";
export const removeMember: NonNullable<MutationResolvers["removeMember"]> =
	async (_parent, { data }, ctx) => {
		const removeMemberResult = await ctx.organizations.removeMember(ctx, {
			memberId: data.id,
		});
		if (!removeMemberResult.ok) {
			switch (removeMemberResult.error.name) {
				case "InvalidArgumentError":
				case "PermissionDeniedError":
				case "UnauthorizedError":
					throw removeMemberResult.error;
			}
		}
		const { member } = removeMemberResult.data;
		return { member };
	};

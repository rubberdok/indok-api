import type { PrivateUserResolvers } from "./../../types.generated.js";
export const PrivateUser: PrivateUserResolvers = {
	/* Implement PrivateUser resolver logic here */
	organizations: (user, _args, ctx) => {
		return ctx.organizations.organizations.findMany({ userId: user.id });
	},
	studyProgram: (user, _args, ctx) => {
		if (!user.studyProgramId) return null;
		return ctx.users.getStudyProgram({ id: user.studyProgramId });
	},
	signUps: async (user, { data }, ctx) => {
		let orderBy: "asc" | "desc" | undefined = undefined;
		if (data?.orderBy === "ASC") {
			orderBy = "asc";
		} else if (data?.orderBy === "DESC") {
			orderBy = "desc";
		}
		const findManySignUpsResult = await ctx.events.findManySignUpsForUser(ctx, {
			userId: user.id,
			orderBy,
			participationStatus: data?.participationStatus,
		});
		if (!findManySignUpsResult.ok) {
			switch (findManySignUpsResult.error.name) {
				case "UnauthorizedError": {
					return {
						signUps: [],
						total: 0,
					};
				}
				case "InternalServerError": {
					throw findManySignUpsResult.error;
				}
			}
		}

		const { signUps, total } = findManySignUpsResult.data;
		return {
			signUps,
			total,
		};
	},
};

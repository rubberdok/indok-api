import type { PrivateUserResolvers } from "./../../types.generated.js";
export const PrivateUser: PrivateUserResolvers = {
	/* Implement PrivateUser resolver logic here */
	organizations: (user, _args, ctx) => {
		return ctx.organizations.findMany({ userId: user.id });
	},
	studyProgram: (user, _args, ctx) => {
		if (!user.studyProgramId) return null;
		return ctx.users.getStudyProgram({ id: user.studyProgramId });
	},
};

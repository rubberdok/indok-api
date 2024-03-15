import type { PublicUserResolvers } from "./../../types.generated.js";
export const PublicUser: PublicUserResolvers = {
	gradeYear: (parent) => {
		return parent.gradeYear;
	},
};

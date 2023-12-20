import type { PrivateUserResolvers } from "./../../types.generated.js";
export const PrivateUser: PrivateUserResolvers = {
	/* Implement PrivateUser resolver logic here */
	organizations: (user, _args, ctx) => {
		return ctx.organizationService.findMany({ userId: user.id });
	},
	allergies: () => {
		/* PrivateUser.allergies resolver is required because PrivateUser.allergies exists but PrivateUserMapper.allergies does not */
	},
	canUpdateYear: () => {
		/* PrivateUser.canUpdateYear resolver is required because PrivateUser.canUpdateYear exists but PrivateUserMapper.canUpdateYear does not */
	},
	createdAt: () => {
		/* PrivateUser.createdAt resolver is required because PrivateUser.createdAt exists but PrivateUserMapper.createdAt does not */
	},
	email: () => {
		/* PrivateUser.email resolver is required because PrivateUser.email exists but PrivateUserMapper.email does not */
	},
	firstLogin: () => {
		/* PrivateUser.firstLogin resolver is required because PrivateUser.firstLogin exists but PrivateUserMapper.firstLogin does not */
	},
	firstName: () => {
		/* PrivateUser.firstName resolver is required because PrivateUser.firstName exists but PrivateUserMapper.firstName does not */
	},
	gradeYear: () => {
		/* PrivateUser.gradeYear resolver is required because PrivateUser.gradeYear exists but PrivateUserMapper.gradeYear does not */
	},
	graduationYear: () => {
		/* PrivateUser.graduationYear resolver is required because PrivateUser.graduationYear exists but PrivateUserMapper.graduationYear does not */
	},
	graduationYearUpdatedAt: () => {
		/* PrivateUser.graduationYearUpdatedAt resolver is required because PrivateUser.graduationYearUpdatedAt exists but PrivateUserMapper.graduationYearUpdatedAt does not */
	},
	id: () => {
		/* PrivateUser.id resolver is required because PrivateUser.id exists but PrivateUserMapper.id does not */
	},
	isSuperUser: () => {
		/* PrivateUser.isSuperUser resolver is required because PrivateUser.isSuperUser exists but PrivateUserMapper.isSuperUser does not */
	},
	lastName: () => {
		/* PrivateUser.lastName resolver is required because PrivateUser.lastName exists but PrivateUserMapper.lastName does not */
	},
	phoneNumber: () => {
		/* PrivateUser.phoneNumber resolver is required because PrivateUser.phoneNumber exists but PrivateUserMapper.phoneNumber does not */
	},
	username: () => {
		/* PrivateUser.username resolver is required because PrivateUser.username exists but PrivateUserMapper.username does not */
	},
};

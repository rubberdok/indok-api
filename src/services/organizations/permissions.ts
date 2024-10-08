import {
	type FeaturePermissionType,
	OrganizationRole,
	type OrganizationRoleType,
} from "~/domain/organizations.js";
import type { Context } from "~/lib/context.js";
import type { Dependencies } from "./service.js";

function buildPermissions({
	userService,
	memberRepository,
	organizationRepository,
}: Dependencies) {
	/**
	 * hasOrganizationRole checks if the user has at least the given role in the organization.
	 * This method does not check if the user is a super user.
	 *
	 * By at least the given role, we mean that if the user is an admin, this method will
	 * will return true if the user is an ADMIN, but the required role is MEMBER, because
	 * admins can perform all actions of members.
	 *
	 *
	 * @param data.userId - The ID of the user to check
	 * @param data.organizationId - The ID of the organization to check
	 * @param data.role - The required role of the user in the organization
	 * @returns true if the user has at least the given role in the organization, false otherwise
	 */
	async function hasOrganizationRole(
		ctx: Context,
		data: {
			organizationId: string;
			role: OrganizationRoleType;
		},
	): Promise<boolean> {
		const { organizationId, role } = data;
		if (!ctx.user) return false;

		/**
		 * Check if the user has the admin role in the organization. Admins can perform
		 * all actions in the organization, so we can return true immediately.
		 */
		const isAdmin = await memberRepository.hasRole({
			userId: ctx.user.id,
			organizationId,
			role: OrganizationRole.ADMIN,
		});
		if (isAdmin === true) return true;

		/**
		 * If the user is not an admin, check if they have the required role in the
		 * organization.
		 */
		return await memberRepository.hasRole({
			userId: ctx.user.id,
			organizationId,
			role,
		});
	}
	return {
		/**
		 * Check if a user has a given role in an organization. This method serves as a
		 * permission check for the user to perform actions for a given organization.
		 * For example create events, add members, etc.
		 *
		 * Certain actions require a specific feature permission in addition to the role.
		 * For example, to manage cabins, the organization must have the `CABIN_ADMIN` feature
		 * permission. To require a feature permission, pass it as the `featurePermission` argument.
		 *
		 * Since this method returns a promise, which, prior to its resolution, is a truthy
		 * value, it is recommended to explicitly check the value against `true` to avoid
		 * any potential situations where this.hasRole() returns a truthy value that is not
		 * a boolean. I.e. `if (await this.hasRole(...) === true) { ... }`
		 *
		 * Futhermore, when used for permission checks, it is recommended to fail securely, so
		 * instead of `if (await this.hasRole(...) = false) { throw new PermissionDeniedError() }`,
		 * use `if (await this.hasRole(...) === true) { /* do something *\/ } else { throw new PermissionDeniedError() }`
		 *
		 *
		 * @param data.userId - The ID of the user to check
		 * @param data.organizationId - The ID of the organization to check
		 * @param data.role - The required role of the user in the organization
		 * @param data.featurePermission - The required feature permission for the organization
		 * @returns
		 */
		async hasRole(
			ctx: Context,
			data: {
				organizationId: string;
				role: OrganizationRoleType;
				featurePermission?: FeaturePermissionType;
			},
		): Promise<boolean> {
			const { organizationId, role, featurePermission } = data;
			if (!ctx.user) return false;

			if (ctx.user.isSuperUser) return true;

			const hasRole = await hasOrganizationRole(ctx, {
				organizationId,
				role,
			});
			if (hasRole === false) return false;
			if (!featurePermission) return true;

			const organization = await organizationRepository.get(organizationId);
			const hasFeaturePermission =
				organization.featurePermissions.includes(featurePermission);
			return hasFeaturePermission;
		},

		/**
		 * hasFeaturePermission checks if the user has a membership in an organization with the given feature permission.
		 *
		 * - If the user is a super user, this method will return true.
		 * - If the user is not a super user, this method will return true if the user has a membership in an organization
		 *  with the given feature permission.
		 * - If the user is not a super user, and the user does not have a membership in an organization with the given
		 * feature permission, this method will return false.
		 * - If the user is not a super user, nor a member of an organization with the given feature permission, this method
		 * checks if the user's study program has the given feature permission. If the user's study program has the given
		 * feature permission, this method will return true, otherwise false.
		 *
		 * @param data.userId - The ID of the user to check
		 * @param data.featurePermission - The required feature permission for the organization
		 * @returns true if the user has a membership in an organization with the given feature permission, or is a super user, false otherwise
		 */
		async hasFeaturePermission(
			ctx: Context,
			data: {
				featurePermission: FeaturePermissionType;
			},
		): Promise<boolean> {
			if (!ctx.user) return false;

			const { featurePermission } = data;

			if (ctx.user.isSuperUser) return true;

			const organizations = await organizationRepository.findManyByUserId({
				userId: ctx.user.id,
			});

			const hasFeaturePermission = organizations.some((organization) =>
				organization.featurePermissions.includes(featurePermission),
			);
			if (hasFeaturePermission) return true;

			const user = await userService.get(ctx.user.id);
			if (!user.confirmedStudyProgramId) return false;
			const studyProgram = await userService.getStudyProgram({
				id: user.confirmedStudyProgramId,
			});
			if (studyProgram?.featurePermissions.includes(featurePermission)) {
				return true;
			}
			return false;
		},
	};
}
export { buildPermissions };

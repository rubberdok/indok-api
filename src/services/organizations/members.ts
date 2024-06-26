import {
	InternalServerError,
	InvalidArgumentError,
	InvalidArgumentErrorV2,
	NotFoundError,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
import {
	OrganizationMember,
	OrganizationRole,
	type OrganizationRoleType,
} from "~/domain/organizations.js";
import type { Context } from "~/lib/context.js";
import { Result } from "~/lib/result.js";
import type { IOrganizationService } from "~/lib/server.js";
import type { Dependencies } from "./service.js";

interface PermissionService {
	hasRole(
		ctx: Context,
		data: {
			organizationId: string;
			role: OrganizationRoleType;
		},
	): Promise<boolean>;
}

function buildMembers(
	{ memberRepository }: Dependencies,
	{ permissions }: { permissions: PermissionService },
): IOrganizationService["members"] {
	return {
		async findMany(ctx, params) {
			const { organizationId } = params;
			if (!ctx.user) {
				return {
					ok: false,
					error: new UnauthorizedError(
						"You must be logged in to get members of an organization.",
					),
				};
			}

			const isMember = await permissions.hasRole(ctx, {
				organizationId,
				role: OrganizationRole.MEMBER,
			});
			if (!isMember) {
				return {
					ok: false,
					error: new PermissionDeniedError(
						"You must be a member of the organization to get its members.",
					),
				};
			}
			const members = await memberRepository.findMany({ organizationId });
			return { ok: true, data: { members } };
		},

		/**
		 * Remove a user as a member from an organization, regardless of role.
		 *
		 * There must always be at least one admin in an organization, so if the user
		 * being removed is the last admin, we abort and raise an error.
		 *
		 * Cases to consider:
		 * 1. The user being removed (data.userId) is the only member of the organization -> abort ❌
		 *    - Members: `[{ userId: "1", role: OrganizationRole.ADMIN }]`
		 * 2. The user being removed (data.userId) is the only _admin_ of the organization -> abort ❌
		 *    - Members: `[{ userId: "1", role: OrganizationRole.ADMIN }, { userId: "2", role: OrganizationRole.MEMBER }]`
		 * 3. The user being removed (data.userId) is _not_ the only admin of the organization -> remove ✅
		 *    - Members: `[{ userId: "1", role: OrganizationRole.ADMIN }, { userId: "2", role: OrganizationRole.ADMIN }]`
		 *
		 * @requires The user must be an admin of the organization
		 * @throws {InvalidArgumentError} - If the user is the only member of the organization
		 * @throws {PermissionDeniedError} - If the user is not an admin of the organization
		 * @param userId - The ID of the user performing the action
		 * @param data.userId - The ID of the user to remove from the organization
		 * @param data.organizationId - The ID of the organization to remove the user from
		 * @returns
		 */
		async removeMember(ctx, params) {
			ctx.log.info({ params }, "removing member from organization");

			if (!ctx.user) {
				return {
					ok: false,
					error: new UnauthorizedError(
						"You must be logged in to remove a member.",
					),
				};
			}

			const { memberId } = params;
			const memberToRemove = await memberRepository.get({ id: memberId });
			const { organizationId } = memberToRemove;

			let requiredRole: OrganizationRoleType = OrganizationRole.ADMIN;
			/* Removing yourself from an organization, i.e. leaving, does not require you to be an admin. */
			if (ctx.user.id === memberToRemove.userId) {
				requiredRole = OrganizationRole.MEMBER;
			}

			const hasRequiredRole = await permissions.hasRole(ctx, {
				organizationId,
				role: requiredRole,
			});
			/**
			 * We explicitly check that the value is `true` to avoid any potential situations
			 * where permissionService.hasRole() returns a truthy value that is not a boolean.
			 */
			if (hasRequiredRole !== true) {
				return {
					ok: false,
					error: new PermissionDeniedError(
						"You must be an admin of the organization to remove a member.",
					),
				};
			}

			/**
			 * We have to take extra care when removing admins, as we
			 * cannot remove the last admin of an organization.
			 */
			const removingAnAdmin = memberToRemove.role === OrganizationRole.ADMIN;
			if (!removingAnAdmin) {
				/**
				 * If we're not removing an admin, we're safe to go ahead, as
				 * a member cannot be the last remaining admin of an organization.
				 */
				const removedMember = await memberRepository.remove({
					id: memberId,
				});
				return { ok: true, data: { member: removedMember } };
			}

			// Find all admins in the organization
			const adminsInTheOrganization = await memberRepository.findMany({
				organizationId: organizationId,
				role: OrganizationRole.ADMIN,
			});

			/**
			 * We know that if we've reached this point, we're removing an admin.
			 *
			 * If there is only one admin left in the organization, that must necessarily be
			 * the admin we're removing. As such, we cannot remove them
			 * as that would leave the organization without any members.
			 * So if the length here is 1, we abort.
			 */
			if (adminsInTheOrganization.length === 1) {
				return {
					ok: false,
					error: new InvalidArgumentError(`
				Cannot remove the last admin of an organization.
				To remove yourself as an admin, first add another admin to the organization.
			 `),
				};
			}

			// If we've reached this point, we have more than one admin left, and
			// we can safely remove this admin.
			const removedMember = await memberRepository.remove({
				id: memberId,
			});
			return { ok: true, data: { member: removedMember } };
		},

		/**
		 * Add a user as a member to an organization
		 * @requires The user must be an admin of the organization
		 * @param userId - The ID of the user performing the action
		 * @param data.userId - The ID of the user to add to the organization
		 * @param data.email - The email of the user to add to the organization
		 * @param data.organizationId - The ID of the organization to add the user to
		 * @param data.role - The role of the user in the organization
		 * @returns The created membership
		 */
		async addMember(ctx, data) {
			if (!ctx.user) {
				return Result.error(
					new UnauthorizedError("You must be logged in to add a member."),
				);
			}

			const isAdmin = await permissions.hasRole(ctx, {
				organizationId: data.organizationId,
				role: OrganizationRole.ADMIN,
			});
			/**
			 * We explicitly check that the value is `true` to avoid any potential situations
			 * where permissions.hasRole() returns a truthy value that is not a boolean.
			 */
			if (isAdmin !== true) {
				return Result.error(
					new PermissionDeniedError(
						"You must be an admin of the organization to add a member.",
					),
				);
			}
			const addMemberResult = await memberRepository.create(data);
			if (!addMemberResult.ok) {
				const { error } = addMemberResult;
				if (error instanceof InvalidArgumentErrorV2) {
					return Result.error(
						new InvalidArgumentErrorV2(
							"The user is already a member of the organization.",
							{ cause: error },
						),
					);
				}
				if (error instanceof NotFoundError) {
					return Result.error(
						new NotFoundError("The user does not exist.", error),
					);
				}
				return Result.error(
					new InternalServerError("Failed to add member.", error),
				);
			}
			const { member: addedMember } = addMemberResult.data;
			return { ok: true, data: { member: addedMember } };
		},

		async updateRole(ctx, params) {
			if (!ctx.user) {
				return Result.error(
					new UnauthorizedError("You must be logged in to update a role."),
				);
			}

			const { memberId, newRole } = params;
			try {
				const memberToUpdate = await memberRepository.get({ id: memberId });
				if (memberToUpdate.userId === ctx.user.id) {
					return Result.error(
						new InvalidArgumentErrorV2("You cannot change your own role."),
					);
				}

				const { organizationId } = memberToUpdate;

				const isAdmin = await permissions.hasRole(ctx, {
					organizationId,
					role: OrganizationRole.ADMIN,
				});
				if (isAdmin !== true) {
					return Result.error(
						new PermissionDeniedError(
							"You must be an admin of the organization to update a role.",
						),
					);
				}

				const result = await memberRepository.updateRole(ctx, {
					memberId,
					role: newRole,
				});

				if (!result.ok) {
					return Result.error(result.error);
				}
				return Result.success({
					member: new OrganizationMember(result.data.member),
				});
			} catch (err) {
				if (err instanceof NotFoundError) {
					return Result.error(new NotFoundError("Member not found.", err));
				}
				return Result.error(
					new InternalServerError("Failed to update role.", err),
				);
			}
		},
	};
}
export { buildMembers };

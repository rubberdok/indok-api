import type { Member } from "@prisma/client";
import type { Dependencies } from "./service.js";
import type { ResultAsync } from "~/lib/result.js";
import {
	InvalidArgumentError,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
import type { Context } from "~/lib/context.js";
import { Role } from "~/domain/organizations.js";

interface PermissionService {
	hasRole(
		ctx: Context,
		data: {
			organizationId: string;
			role: Role;
		},
	): Promise<boolean>;
}

function buildMembers(
	{ memberRepository }: Dependencies,
	{ permissions }: { permissions: PermissionService },
) {
	return {
		async findMany(
			ctx: Context,
			params: { organizationId: string },
		): ResultAsync<
			{ members: Member[] },
			PermissionDeniedError | UnauthorizedError
		> {
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
				role: Role.MEMBER,
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
		 *    - Members: `[{ userId: "1", role: Role.ADMIN }]`
		 * 2. The user being removed (data.userId) is the only _admin_ of the organization -> abort ❌
		 *    - Members: `[{ userId: "1", role: Role.ADMIN }, { userId: "2", role: Role.MEMBER }]`
		 * 3. The user being removed (data.userId) is _not_ the only admin of the organization -> remove ✅
		 *    - Members: `[{ userId: "1", role: Role.ADMIN }, { userId: "2", role: Role.ADMIN }]`
		 *
		 * @requires The user must be an admin of the organization
		 * @throws {InvalidArgumentError} - If the user is the only member of the organization
		 * @throws {PermissionDeniedError} - If the user is not an admin of the organization
		 * @param userId - The ID of the user performing the action
		 * @param data.userId - The ID of the user to remove from the organization
		 * @param data.organizationId - The ID of the organization to remove the user from
		 * @returns
		 */
		async removeMember(
			ctx: Context,
			params: { memberId: string },
		): ResultAsync<
			{ member: Member },
			UnauthorizedError | PermissionDeniedError | InvalidArgumentError
		> {
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

			let requiredRole: Role = Role.ADMIN;
			/* Removing yourself from an organization, i.e. leaving, does not require you to be an admin. */
			if (ctx.user.id === memberToRemove.userId) {
				requiredRole = Role.MEMBER;
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
			const removingAnAdmin = memberToRemove.role === Role.ADMIN;
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
				role: Role.ADMIN,
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
		 * @param data.organizationId - The ID of the organization to add the user to
		 * @param data.role - The role of the user in the organization
		 * @returns The created membership
		 */
		async addMember(
			ctx: Context,
			data: { userId: string; organizationId: string; role: Role },
		): ResultAsync<
			{ member: Member },
			PermissionDeniedError | UnauthorizedError
		> {
			if (!ctx.user) {
				return {
					ok: false,
					error: new UnauthorizedError(
						"You must be logged in to add a member.",
					),
				};
			}

			const isAdmin = await permissions.hasRole(ctx, {
				organizationId: data.organizationId,
				role: Role.ADMIN,
			});
			/**
			 * We explicitly check that the value is `true` to avoid any potential situations
			 * where permissions.hasRole() returns a truthy value that is not a boolean.
			 */
			if (isAdmin !== true) {
				return {
					ok: false,
					error: new PermissionDeniedError(
						"You must be an admin of the organization to add a member.",
					),
				};
			}
			const addedMember = await memberRepository.create(data);
			return { ok: true, data: { member: addedMember } };
		},
	};
}
export { buildMembers };

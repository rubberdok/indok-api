import {
	FeaturePermission,
	type Member,
	type Organization,
} from "@prisma/client";
import { z } from "zod";
import {
	InvalidArgumentError,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
import { Role } from "~/domain/organizations.js";
import type { Context } from "~/lib/context.js";
import type { ResultAsync } from "~/lib/result.js";

export interface OrganizationRepository {
	create(data: {
		name: string;
		description?: string;
		userId: string;
		featurePermissions?: FeaturePermission[];
	}): Promise<Organization>;
	update(
		id: string,
		data: {
			name?: string;
			description?: string;
			featurePermissions?: FeaturePermission[];
		},
	): Promise<Organization>;
	get(id: string): Promise<Organization>;
	findMany(): Promise<Organization[]>;
	findManyByUserId(data?: { userId?: string }): Promise<Organization[]>;
}

export interface MemberRepository {
	create(data: {
		userId: string;
		organizationId: string;
		role?: string;
	}): Promise<Member>;
	remove(
		data: { id: string } | { userId: string; organizationId: string },
	): Promise<Member>;
	findMany(data: { organizationId: string; role?: Role }): Promise<Member[]>;
	get(
		data: { userId: string; organizationId: string } | { id: string },
	): Promise<Member>;
}

export interface PermissionService {
	hasRole(
		ctx: Context,
		data: {
			organizationId: string;
			role: Role;
		},
	): Promise<boolean>;
}

export class OrganizationService {
	constructor(
		private organizationRepository: OrganizationRepository,
		private memberRepository: MemberRepository,
		private permissionService: PermissionService,
	) {}

	/**
	 * Create a new organization, and add the given user as an admin member of the
	 * organization.
	 *
	 * The user must be a super user to create an organization with a feature permission
	 *
	 * @param userId - The ID of the user to add to the organization as an admin
	 * @param data.name - The name of the organization
	 * @param data.description - The description of the organization (optional)
	 * @param data.featurePermissions - The feature permissions to grant to the user (optional)
	 * @returns The created organization
	 */
	async create(
		ctx: Context,
		data: {
			name: string;
			description?: string | null;
			featurePermissions?: FeaturePermission[] | null;
		},
	): Promise<Organization> {
		if (!ctx.user) {
			throw new UnauthorizedError(
				"You must be logged in to create an organization.",
			);
		}
		const { isSuperUser, id: userId } = ctx.user;

		const baseSchema = z.object({
			name: z.string().min(1).max(100),
			description: z
				.string()
				.max(10000)
				.nullish()
				.transform((val) => val ?? undefined),
		});
		try {
			if (isSuperUser === true) {
				const schema = baseSchema.extend({
					featurePermissions: z
						.array(z.nativeEnum(FeaturePermission))
						.nullish()
						.transform((val) => val ?? undefined),
				});
				const { name, description, featurePermissions } = schema.parse(data);
				const organization = await this.organizationRepository.create({
					name,
					description,
					userId,
					featurePermissions,
				});
				return organization;
			}
			const schema = baseSchema;
			const { name, description } = schema.parse(data);
			const organization = await this.organizationRepository.create({
				name,
				description,
				userId,
			});
			return organization;
		} catch (err) {
			if (err instanceof z.ZodError)
				throw new InvalidArgumentError(err.message);
			throw err;
		}
	}

	/**
	 * Update information about an organization, such as the name or description.
	 * To modify members, use the `addMember` and `removeMember` methods.
	 *
	 * @requires - The user must be a member of the organization
	 * @throws {InvalidArgumentError} - If the name or description is invalid
	 * @throws {PermissionDeniedError} - If the user is not a member of the organization
	 * @param data.organizationId - The ID of the organization
	 * @param data.name - The new name of the organization
	 * @param data.description - The new description of the organization
	 * @param userId - The ID of the user performing the update
	 * @returns The updated organization
	 */
	async update(
		ctx: Context,
		organizationId: string,
		data: Partial<{
			name: string | null;
			description: string | null;
			featurePermissions: FeaturePermission[] | null;
		}>,
	): Promise<Organization> {
		if (!ctx.user) {
			throw new UnauthorizedError(
				"You must be logged in to update an organization.",
			);
		}

		const baseSchema = z.object({
			name: z
				.string()
				.min(1)
				.max(100)
				.nullish()
				.transform((val) => val ?? undefined),
			description: z
				.string()
				.max(10000)
				.nullish()
				.transform((val) => val ?? undefined),
		});

		const { isSuperUser, id: userId } = ctx.user;

		try {
			if (isSuperUser) {
				const superUserSchema = baseSchema.extend({
					featurePermissions: z
						.array(z.nativeEnum(FeaturePermission))
						.nullish()
						.transform((val) => val ?? undefined),
				});

				const { name, description, featurePermissions } =
					superUserSchema.parse(data);
				return await this.organizationRepository.update(organizationId, {
					name,
					description,
					featurePermissions,
				});
			}
			const isMember = await this.permissionService.hasRole(ctx, {
				organizationId,
				role: Role.MEMBER,
			});
			if (isMember !== true) {
				throw new PermissionDeniedError(
					"You must be a member of the organization to update it.",
				);
			}

			const schema = baseSchema;
			const { name, description } = schema.parse(data);

			return await this.organizationRepository.update(organizationId, {
				name,
				description,
			});
		} catch (err) {
			if (err instanceof z.ZodError)
				throw new InvalidArgumentError(err.message);
			throw err;
		}
	}

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
				error: new UnauthorizedError("You must be logged in to add a member."),
			};
		}

		const isAdmin = await this.permissionService.hasRole(ctx, {
			organizationId: data.organizationId,
			role: Role.ADMIN,
		});
		/**
		 * We explicitly check that the value is `true` to avoid any potential situations
		 * where this.permissionService.hasRole() returns a truthy value that is not a boolean.
		 */
		if (isAdmin !== true) {
			return {
				ok: false,
				error: new PermissionDeniedError(
					"You must be an admin of the organization to add a member.",
				),
			};
		}
		const addedMember = await this.memberRepository.create(data);
		return { ok: true, data: { member: addedMember } };
	}

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
		const memberToRemove = await this.memberRepository.get({ id: memberId });
		const { organizationId } = memberToRemove;

		let requiredRole: Role = Role.ADMIN;
		/* Removing yourself from an organization, i.e. leaving, does not require you to be an admin. */
		if (ctx.user.id === memberToRemove.userId) {
			requiredRole = Role.MEMBER;
		}

		const hasRequiredRole = await this.permissionService.hasRole(ctx, {
			organizationId,
			role: requiredRole,
		});
		/**
		 * We explicitly check that the value is `true` to avoid any potential situations
		 * where this.permissionService.hasRole() returns a truthy value that is not a boolean.
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
			const removedMember = await this.memberRepository.remove({
				id: memberId,
			});
			return { ok: true, data: { member: removedMember } };
		}

		// Find all admins in the organization
		const adminsInTheOrganization = await this.memberRepository.findMany({
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
		const removedMember = await this.memberRepository.remove({ id: memberId });
		return { ok: true, data: { member: removedMember } };
	}

	/**
	 * Get members for an organization
	 *
	 * The user must be a member of the organization
	 * @param organizationId - The ID of the organization
	 * @param userId - The ID of the user making the request
	 * @returns
	 */
	async getMembers(
		ctx: Context,
		organizationId: string,
	): ResultAsync<
		{ members: Member[] },
		PermissionDeniedError | UnauthorizedError
	> {
		if (!ctx.user) {
			return {
				ok: false,
				error: new UnauthorizedError(
					"You must be logged in to get members of an organization.",
				),
			};
		}

		const isMember = await this.permissionService.hasRole(ctx, {
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
		const members = await this.memberRepository.findMany({ organizationId });
		return { ok: true, data: { members } };
	}

	/**
	 * Get an organization by ID
	 */
	async get(id: string): Promise<Organization> {
		return await this.organizationRepository.get(id);
	}

	/**
	 * findMany returns all organizations matching the filters
	 *
	 * @params data - filters for the query
	 * @returns - all organizations matching the filters
	 */
	async findMany(data?: { userId?: string }): Promise<Organization[]> {
		if (!data) return await this.organizationRepository.findMany();
		if (data.userId)
			return await this.organizationRepository.findManyByUserId(data);
		return [];
	}
}

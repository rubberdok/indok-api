import { z } from "zod";
import type { Dependencies } from "./service.js";
import { FeaturePermission, type Organization } from "@prisma/client";
import { Role } from "~/domain/organizations.js";
import {
	InvalidArgumentError,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
import type { Context } from "~/lib/context.js";

interface PermissionService {
	hasRole(
		ctx: Context,
		data: {
			organizationId: string;
			role: Role;
		},
	): Promise<boolean>;
}

function buildOrganizations(
	{ organizationRepository }: Dependencies,
	{ permissions }: { permissions: PermissionService },
) {
	return {
		async findMany(params?: { userId?: string }): Promise<Organization[]> {
			if (!params) return await organizationRepository.findMany();
			if (params.userId)
				return await organizationRepository.findManyByUserId(params);
			return [];
		},

		/**
		 * Get an organization by ID
		 */
		async get(id: string): Promise<Organization> {
			return await organizationRepository.get(id);
		},

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

			const { isSuperUser } = ctx.user;

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
					return await organizationRepository.update(organizationId, {
						name,
						description,
						featurePermissions,
					});
				}
				const isMember = await permissions.hasRole(ctx, {
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

				return await organizationRepository.update(organizationId, {
					name,
					description,
				});
			} catch (err) {
				if (err instanceof z.ZodError)
					throw new InvalidArgumentError(err.message);
				throw err;
			}
		},

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
					const organization = await organizationRepository.create({
						name,
						description,
						userId,
						featurePermissions,
					});
					return organization;
				}
				const schema = baseSchema;
				const { name, description } = schema.parse(data);
				const organization = await organizationRepository.create({
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
		},
	};
}

export { buildOrganizations };

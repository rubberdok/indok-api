import { FeaturePermission, Organization, PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";
import {
	InternalServerError,
	InvalidArgumentError,
	NotFoundError,
} from "~/domain/errors.js";
import { Role } from "~/domain/organizations.js";
import { prismaKnownErrorCodes } from "~/lib/prisma.js";

export class OrganizationRepository {
	constructor(private db: PrismaClient) {}

	async findMany(): Promise<Organization[]> {
		return this.db.organization.findMany();
	}

	/**
	 * Create a new organization, and add the given users as admins of the organization.
	 *
	 * @throws {InvalidArgumentError} - If the organization name is already taken
	 * @throws {InvalidArgumentError} - If the userId is the empty string
	 * @param data.name - The name of the organization
	 * @param data.description - The description of the organization
	 * @param data.userId - The ID of the user to add as an admin of the organization
	 * @param data.featurePermissions - The feature permissions of the organization
	 * @returns The created organization
	 */
	async create(data: {
		name: string;
		description?: string;
		userId: string;
		featurePermissions?: FeaturePermission[];
	}): Promise<Organization> {
		const { userId, ...rest } = data;
		return this.db.organization
			.create({
				data: {
					members: {
						create: {
							userId,
							role: Role.ADMIN,
						},
					},
					...rest,
				},
			})
			.catch((err) => {
				if (err instanceof PrismaClientKnownRequestError) {
					if (
						err.code === prismaKnownErrorCodes.ERR_UNIQUE_CONSTRAINT_VIOLATION
					) {
						throw new InvalidArgumentError(
							"The organization name is already taken.",
						);
					}
				}
				throw err;
			});
	}

	/**
	 * Update an organization with the given name and description.
	 * Passing undefined for a value will leave the value unchanged.
	 *
	 * @param data.id - The ID of the organization to update
	 * @param data.name - Thew new name of the organization
	 * @param data.description - The new description of the organization
	 * @returns
	 */
	async update(
		id: string,
		data: {
			name?: string;
			description?: string;
			featurePermissions?: FeaturePermission[];
		},
	): Promise<Organization> {
		const { name, description, featurePermissions } = data;
		return this.db.organization.update({
			where: { id },
			data: {
				name,
				description,
				featurePermissions,
			},
		});
	}

	/**
	 * Find an organization by ID, or throw an error if the organization does not exist.
	 *
	 * @throws {NotFoundError} - If the organization does not exist
	 * @param id - The ID of the organization to fetch
	 * @returns Organization
	 */
	async get(id: string): Promise<Organization> {
		return this.db.organization
			.findUniqueOrThrow({ where: { id } })
			.catch((err) => {
				if (err instanceof PrismaClientKnownRequestError) {
					/**
					 * "An operation failed because it depends on one or more records that were required but not found. {cause}"
					 * https://www.prisma.io/docs/reference/api-reference/error-reference#p2025
					 */
					if (err.code === "P2025") {
						throw new NotFoundError("The organization does not exist.");
					}
					throw err;
				}
				throw new InternalServerError(err.message);
			});
	}

	/**
	 * findManyByUserId - Find all organizations that the given user is a member of.
	 * If no userId is given, all organizations are returned.
	 * If the user is not a member of any organizations, an empty array is returned.
	 * If the user does not exist, an empty array is returned.
	 *
	 * @param data.userId - The ID of the user to find organizations for
	 * @returns Organization[]
	 */
	async findManyByUserId(data?: { userId?: string }): Promise<Organization[]> {
		const { userId } = data ?? {};
		if (userId === undefined) {
			return this.findMany();
		}
		return this.db.organization.findMany({
			where: {
				members: {
					some: {
						userId,
					},
				},
			},
		});
	}
}

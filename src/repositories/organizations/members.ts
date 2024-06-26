import type { Prisma, PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";
import {
	InternalServerError,
	InvalidArgumentErrorV2,
	NotFoundError,
} from "~/domain/errors.js";
import {
	OrganizationMember,
	type OrganizationRoleType,
} from "~/domain/organizations.js";
import type { Context } from "~/lib/context.js";
import { prismaKnownErrorCodes } from "~/lib/prisma.js";
import { Result, type ResultAsync } from "~/lib/result.js";
import type { MemberRepository as IMemberRepository } from "~/services/organizations/service.js";

export class MemberRepository implements IMemberRepository {
	constructor(private db: PrismaClient) {}

	async updateRole(
		ctx: Context,
		data: { memberId: string; role: OrganizationRoleType },
	): ResultAsync<
		{ member: OrganizationMember },
		InternalServerError | NotFoundError
	> {
		ctx.log.info({ data }, "updating member role");
		const { memberId, role } = data;
		try {
			const updatedMember = await this.db.member.update({
				where: {
					id: memberId,
				},
				data: {
					role,
				},
			});

			return Result.success({ member: updatedMember });
		} catch (err) {
			if (err instanceof PrismaClientKnownRequestError) {
				if (err.code === prismaKnownErrorCodes.ERR_NOT_FOUND) {
					return Result.error(
						new NotFoundError("The membership does not exist."),
					);
				}
			}
			return Result.error(
				new InternalServerError("failed to update member role", err),
			);
		}
	}

	findMany(where?: { organizationId?: string; userId?: string }): Promise<
		OrganizationMember[]
	> {
		return this.db.member.findMany({
			where,
		});
	}

	async hasRole(data: {
		userId: string;
		organizationId: string;
		role: OrganizationRoleType;
	}): Promise<boolean> {
		const { userId, organizationId, role } = data;
		const result = await this.db.member.findFirst({
			where: {
				userId,
				organizationId,
				role,
			},
		});
		return result !== null;
	}

	/**
	 * Get a membership by ID or by user and organization IDs.
	 * If the data.id is given, the membership will be fetched by ID.
	 * If the data.userId and data.organizationId is given, the membership will be fetched by the user and organization IDs.
	 * @param data.id - The ID of the membership to fetch
	 * @param data.userId - The ID of the user to fetch the membership for
	 * @param data.organizationId - The ID of the organization to fetch the membership for
	 * @returns Membership
	 */
	async get(
		data: { id: string } | { userId: string; organizationId: string },
	): Promise<OrganizationMember> {
		try {
			let promise: Promise<OrganizationMember>;
			if ("id" in data) {
				promise = this.db.member.findUniqueOrThrow({ where: { id: data.id } });
			} else {
				promise = this.db.member.findUniqueOrThrow({
					where: {
						userId_organizationId: {
							userId: data.userId,
							organizationId: data.organizationId,
						},
					},
				});
			}
			return await promise;
		} catch (err) {
			if (err instanceof PrismaClientKnownRequestError) {
				if (err.code === prismaKnownErrorCodes.ERR_NOT_FOUND)
					throw new NotFoundError("The membership does not exist.");
			}
			throw err;
		}
	}

	/**
	 * Create a new membership
	 *
	 * @throws InvalidArgumentError - If the data.userId is already a member of the organization
	 * @param {string} data.userId - The ID of the user to add to the organization
	 * @param {string} data.organizationId - The ID of the organization to add the user to
	 * @param {OrganizationRoleType} data.role - The role of the user in the organization, defaults to OrganizationRoleType.MEMBER
	 */
	async create(
		data:
			| {
					userId: string;
					organizationId: string;
					role?: OrganizationRoleType;
			  }
			| {
					email: string;
					organizationId: string;
					role?: OrganizationRoleType;
			  },
	): ResultAsync<
		{ member: OrganizationMember },
		InternalServerError | InvalidArgumentErrorV2 | NotFoundError
	> {
		try {
			let userWhereInput: Prisma.UserWhereUniqueInput;
			if ("userId" in data) {
				userWhereInput = { id: data.userId };
			} else {
				userWhereInput = { email: data.email };
			}

			const member = await this.db.member.create({
				data: {
					organization: {
						connect: { id: data.organizationId },
					},
					role: data.role,
					user: {
						connect: userWhereInput,
					},
				},
			});

			return Result.success({ member: new OrganizationMember(member) });
		} catch (err) {
			if (err instanceof PrismaClientKnownRequestError) {
				if (
					err.code === prismaKnownErrorCodes.ERR_UNIQUE_CONSTRAINT_VIOLATION
				) {
					return Result.error(
						new InvalidArgumentErrorV2(
							"The user is already a member of the organization.",
							{ cause: err },
						),
					);
				}
				if (err.code === prismaKnownErrorCodes.ERR_NOT_FOUND) {
					return Result.error(
						new NotFoundError("The user does not exist.", err),
					);
				}
			}
			return Result.error(
				new InternalServerError("Failed to add member.", err),
			);
		}
	}

	/**
	 * Remove a member from an organization
	 *
	 * If the data.id is given, the membership will be removed by ID.
	 * If the data.userId and data.organizationId is given, the membership will be removed by the user and organization IDs.
	 *
	 * @param data.id - The ID of the membership to remove
	 * @param data.userId - The ID of the user to remove from the organization
	 * @param data.organizationId - The ID of the organization to remove the user from
	 * @returns The removed membership
	 */
	async remove(
		data: { id: string } | { userId: string; organizationId: string },
	): Promise<OrganizationMember> {
		if ("id" in data) {
			const member = await this.db.member.delete({ where: { id: data.id } });
			return new OrganizationMember(member);
		}
		const { userId, organizationId } = data;
		const member = await this.db.member.delete({
			where: { userId_organizationId: { userId, organizationId } },
		});
		return new OrganizationMember(member);
	}
}

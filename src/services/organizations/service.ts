import { FeaturePermission, Member, Organization } from "@prisma/client";
import { z } from "zod";

import { InvalidArgumentError, PermissionDeniedError } from "@/domain/errors.js";
import { Role } from "@/domain/organizations.js";

export interface OrganizationRepository {
  create(data: {
    name: string;
    description?: string;
    userId: string;
    featurePermissions?: FeaturePermission[];
  }): Promise<Organization>;
  update(
    id: string,
    data: { name?: string; description?: string; featurePermissions?: FeaturePermission[] }
  ): Promise<Organization>;
  get(id: string): Promise<Organization>;
  findMany(): Promise<Organization[]>;
  findManyByUserId(data?: { userId?: string }): Promise<Organization[]>;
}

export interface MemberRepository {
  create(data: { userId: string; organizationId: string; role?: string }): Promise<Member>;
  remove(data: { id: string } | { userId: string; organizationId: string }): Promise<Member>;
  findMany(data: { organizationId: string; role?: Role }): Promise<Member[]>;
  get(data: { userId: string; organizationId: string } | { id: string }): Promise<Member>;
}

export interface PermissionService {
  hasRole(data: { userId: string; organizationId: string; role: Role }): Promise<boolean>;
  isSuperUser(userId: string): Promise<{ isSuperUser: boolean }>;
}

export class OrganizationService {
  constructor(
    private organizationRepository: OrganizationRepository,
    private memberRepository: MemberRepository,
    private permissionService: PermissionService
  ) {}

  /**
   * Create a new organization, and add the given user as an admin member of the
   * organization.
   *
   * @requires The user must be a super user to create an organization with a feature permission
   *
   * @param data.name - The name of the organization
   * @param data.description - The description of the organization (optional)
   * @param data.userId - The ID of the user to add to the organization as an admin
   * @param data.featurePermissions - The feature permissions to grant to the user (optional)
   * @returns The created organization
   */
  async create(data: {
    name: string;
    description?: string | null;
    userId: string;
    featurePermissions?: FeaturePermission[] | null;
  }): Promise<Organization> {
    const { isSuperUser } = await this.permissionService.isSuperUser(data.userId);

    const baseSchema = z.object({
      name: z.string().min(1).max(100),
      description: z
        .string()
        .max(10000)
        .nullish()
        .transform((val) => val ?? undefined),
    });

    try {
      if (isSuperUser === false) {
        const schema = baseSchema;
        const { name, description } = schema.parse(data);
        const organization = await this.organizationRepository.create({ name, description, userId: data.userId });
        return organization;
      } else {
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
          userId: data.userId,
          featurePermissions,
        });
        return organization;
      }
    } catch (err) {
      if (err instanceof z.ZodError) throw new InvalidArgumentError(err.message);
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
    userId: string,
    organizationId: string,
    data: Partial<{ name: string | null; description: string | null; featurePermissions: FeaturePermission[] | null }>
  ): Promise<Organization> {
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

    const { isSuperUser } = await this.permissionService.isSuperUser(userId);

    try {
      if (isSuperUser) {
        const superUserSchema = baseSchema.extend({
          featurePermissions: z
            .array(z.nativeEnum(FeaturePermission))
            .nullish()
            .transform((val) => val ?? undefined),
        });

        const { name, description, featurePermissions } = superUserSchema.parse(data);
        return await this.organizationRepository.update(organizationId, {
          name,
          description,
          featurePermissions,
        });
      } else {
        const isMember = await this.permissionService.hasRole({ userId, organizationId, role: Role.MEMBER });
        if (isMember !== true) {
          throw new PermissionDeniedError("You must be a member of the organization to update it.");
        }

        const schema = baseSchema;
        const { name, description } = schema.parse(data);

        return await this.organizationRepository.update(organizationId, {
          name,
          description,
        });
      }
    } catch (err) {
      if (err instanceof z.ZodError) throw new InvalidArgumentError(err.message);
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
  async addMember(userId: string, data: { userId: string; organizationId: string; role: Role }): Promise<Member> {
    const isAdmin = await this.permissionService.hasRole({
      userId,
      organizationId: data.organizationId,
      role: Role.ADMIN,
    });
    /**
     * We explicitly check that the value is `true` to avoid any potential situations
     * where this.permissionService.hasRole() returns a truthy value that is not a boolean.
     */
    if (isAdmin === true) {
      return await this.memberRepository.create(data);
    } else {
      throw new PermissionDeniedError("You must be an admin of the organization to add a member.");
    }
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
  async removeMember(userId: string, data: { userId: string; organizationId: string }): Promise<Member> {
    let requiredRole: Role = Role.ADMIN;
    /* Removing yourself from an organization, i.e. leaving, does not require you to be an admin. */
    if (userId === data.userId) {
      requiredRole = Role.MEMBER;
    }

    const hasRequiredRole = await this.permissionService.hasRole({
      userId,
      organizationId: data.organizationId,
      role: requiredRole,
    });
    /**
     * We explicitly check that the value is `true` to avoid any potential situations
     * where this.permissionService.hasRole() returns a truthy value that is not a boolean.
     */
    if (hasRequiredRole === true) {
      const memberToRemove = await this.memberRepository.get({
        userId: data.userId,
        organizationId: data.organizationId,
      });

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
        return await this.memberRepository.remove(data);
      }

      // Find all admins in the organization
      const adminsInTheOrganization = await this.memberRepository.findMany({
        organizationId: data.organizationId,
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
        throw new InvalidArgumentError(`
          Cannot remove the last admin of an organization.
          To remove yourself as an admin, first add another admin to the organization.
       `);
      }

      // If we've reached this point, we have more than one admin left, and
      // we can safely remove this admin.
      return await this.memberRepository.remove(data);
    } else {
      throw new PermissionDeniedError("You must be an admin of the organization to remove a member.");
    }
  }

  /**
   * Get members for an organization
   *
   * @requires The user must be a member of the organization
   * @param organizationId - The ID of the organization
   * @param userId - The ID of the user making the request
   * @returns
   */
  async getMembers(userId: string, organizationId: string): Promise<Member[]> {
    const isMember = await this.permissionService.hasRole({ userId, organizationId, role: Role.MEMBER });
    if (isMember === true) {
      return await this.memberRepository.findMany({ organizationId });
    } else {
      throw new PermissionDeniedError("You must be a member of the organization to get its members.");
    }
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
    if (data.userId) return await this.organizationRepository.findManyByUserId(data);
    return [];
  }
}

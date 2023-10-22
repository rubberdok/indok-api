import { InvalidArgumentError, PermissionDeniedError } from "@/core/errors.js";
import { Member, Organization, Role, User } from "@prisma/client";
import { z } from "zod";

export interface OrganizationRepository {
  create(data: { name: string; description?: string; userId: string }): Promise<Organization>;
  update(id: string, data: { name?: string; description?: string }): Promise<Organization>;
  get(id: string): Promise<Organization>;
}

export interface MemberRepository {
  create(data: { userId: string; organizationId: string; role?: string }): Promise<Member>;
  remove(data: { id: string } | { userId: string; organizationId: string }): Promise<Member>;
  findMany(data: { organizationId: string; role?: Role }): Promise<Member[]>;
  hasRole(data: { userId: string; organizationId: string; role: Role }): Promise<boolean>;
  get(data: { userId: string; organizationId: string } | { id: string }): Promise<Member | null>;
}

export interface UserService {
  get(id: string): Promise<User>;
}

export class OrganizationService {
  constructor(
    private organizationRepository: OrganizationRepository,
    private memberRepository: MemberRepository,
    private userService: UserService
  ) {}

  /**
   * Check if a user has a given role in an organization. This method serves as a
   * permission check for the user to perform actions for a given organization.
   * For example create events, add members, etc.
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
   * @returns
   */
  async hasRole(data: { userId: string; organizationId: string; role: Role }): Promise<boolean> {
    const { userId, organizationId, role } = data;

    /* Check if the user is a super user, if so, always return true */
    const user = await this.userService.get(userId);
    if (user.isSuperUser === true) return true;

    /**
     * Check if the user has the admin role in the organization. Admins can perform
     * all actions in the organization, so we can return true immediately.
     */
    const isAdmin = await this.memberRepository.hasRole({ userId, organizationId, role: Role.ADMIN });
    if (isAdmin === true) return true;

    /**
     * If the user is not an admin, check if they have the required role in the
     * organization.
     */
    return await this.memberRepository.hasRole({ userId, organizationId, role });
  }

  /**
   * Create a new organization, and add the given user as an admin member of the
   * organization.
   * @param {string} data.name - The name of the organization
   * @param {string} data.description - The description of the organization (optional)
   * @param {string} data.userId - The ID of the user to add to the organization as an admin
   * @returns The created organization
   */
  async create(data: { name: string; description?: string; userId: string }): Promise<Organization> {
    const schema = z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(10000).optional(),
    });
    const parsed = schema.safeParse(data);
    if (!parsed.success) throw new InvalidArgumentError("Invalid input");

    const { name, description } = parsed.data;

    const organization = await this.organizationRepository.create({ name, description, userId: data.userId });
    return organization;
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
    data: { name?: string; description?: string }
  ): Promise<Organization> {
    const isMember = await this.hasRole({ userId, organizationId, role: Role.MEMBER });
    if (isMember === true) {
      const schema = z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(10000).optional(),
      });
      const parsed = schema.safeParse(data);
      if (!parsed.success) throw new InvalidArgumentError("Invalid input");

      const { name, description } = parsed.data;

      const organization = await this.organizationRepository.update(organizationId, {
        name,
        description,
      });
      return organization;
    } else {
      throw new PermissionDeniedError("You must be a member of the organization to update it.");
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
    const isAdmin = await this.hasRole({ userId, organizationId: data.organizationId, role: Role.ADMIN });
    /**
     * We explicitly check that the value is `true` to avoid any potential situations
     * where this.hasRole() returns a truthy value that is not a boolean.
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

    const hasRequiredRole = await this.hasRole({ userId, organizationId: data.organizationId, role: requiredRole });
    /**
     * We explicitly check that the value is `true` to avoid any potential situations
     * where this.hasRole() returns a truthy value that is not a boolean.
     */
    if (hasRequiredRole === true) {
      const memberToRemove = await this.memberRepository.get({
        userId: data.userId,
        organizationId: data.organizationId,
      });
      if (memberToRemove === null) {
        throw new InvalidArgumentError("The user is not a member of the organization.");
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
    const isMember = await this.hasRole({ userId, organizationId, role: Role.MEMBER });
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
}

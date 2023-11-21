import { FeaturePermission, Organization } from "@prisma/client";

import { Role } from "@/domain/organizations.js";
import { User } from "@/domain/users.js";

export interface MemberRepository {
  hasRole(data: { userId: string; organizationId: string; role: Role }): Promise<boolean>;
}

export interface UserService {
  get(id: string): Promise<User>;
}

export interface OrganizationRepository {
  get(id: string): Promise<Organization>;
}

export class PermissionService {
  constructor(
    private memberRepository: MemberRepository,
    private userService: UserService,
    private organizationRepository: OrganizationRepository
  ) {}

  /**
   * isSuperUser returns true if the user is a super user, false otherwise.
   */
  public async isSuperUser(userId: string): Promise<boolean> {
    const user = await this.userService.get(userId);
    return user.isSuperUser;
  }

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
  private async hasOrganizationRole(data: { userId: string; organizationId: string; role: Role }): Promise<boolean> {
    const { userId, organizationId, role } = data;

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
   * Check if a user has a given role in an organization. This method serves as a
   * permission check for the user to perform actions for a given organization.
   * For example create events, add members, etc.
   *
   * Certain actions require a specific feature permission in addition to the role.
   * For example, to manage cabins, the organization must have the `CABIN_BOOKING` feature
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
  async hasRole(data: {
    userId: string;
    organizationId: string;
    role: Role;
    featurePermission?: FeaturePermission;
  }): Promise<boolean> {
    const { userId, organizationId, role, featurePermission } = data;

    const user = await this.userService.get(userId);
    if (user.isSuperUser) return true;

    const hasRole = await this.hasOrganizationRole({ userId, organizationId, role });
    if (hasRole === false) return false;
    if (!featurePermission) return true;

    const organization = await this.organizationRepository.get(organizationId);
    const hasFeaturePermission = organization.featurePermissions.includes(featurePermission);
    return hasFeaturePermission;
  }
}

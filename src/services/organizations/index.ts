import { Member, Organization } from "@prisma/client";

interface OrganizationRepository {
  create(data: { name: string; description?: string; userId: string }): Promise<Organization>;
}

interface MemberRepository {
  create(data: { userId: string; organizationId: string; role?: string }): Promise<Member>;
}

class OrganizationService {
  constructor(
    private organizationRepository: OrganizationRepository,
    private memberRepository: MemberRepository
  ) {}

  /**
   * Create a new organization, and add the given user as an admin member of the
   * organization.
   * @param {string} data.name - The name of the organization
   * @param {string} data.description - The description of the organization (optional)
   * @param {string} data.userId - The ID of the user to add to the organization
   * @returns The created organization
   */
  async create(data: { name: string; description?: string; userId: string }): Promise<Organization> {
    const organization = await this.organizationRepository.create(data);
    return organization;
  }
}

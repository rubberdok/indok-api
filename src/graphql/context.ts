import { FastifyReply, FastifyRequest } from "fastify";

import { IAuthService, ICabinService, IUserService } from "@/services/index.js";
import { Member, Organization, Role } from "@prisma/client";

interface OrganizationService {
  hasRole(data: { userId: string; organizationId: string; role: Role }): Promise<boolean>;
  create(data: { name: string; description?: string; userId: string }): Promise<Organization>;
  update(data: { organizationId: string; name?: string; description?: string }, userId: string): Promise<Organization>;
  addMember(userId: string, data: { userId: string; organizationId: string; role: Role }): Promise<Member>;
  removeMember(userId: string, data: { userId: string; organizationId: string }): Promise<Member>;
}

export interface IContext {
  res: FastifyReply;
  req: FastifyRequest;
  userService: IUserService;
  cabinService: ICabinService;
  authService: IAuthService;
  organizationService: OrganizationService;
}

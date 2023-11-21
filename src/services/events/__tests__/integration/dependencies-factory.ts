import prisma from "@/lib/prisma.js";
import { EventRepository } from "@/repositories/events/repository.js";
import { MemberRepository } from "@/repositories/organizations/members.js";
import { OrganizationRepository } from "@/repositories/organizations/organizations.js";
import { UserRepository } from "@/repositories/users/index.js";
import { PermissionService } from "@/services/permissions/service.js";
import { UserService } from "@/services/users/service.js";

import { EventService } from "../../service.js";

export function makeDependencies() {
  const eventRepository = new EventRepository(prisma);
  const organizationRepository = new OrganizationRepository(prisma);
  const memberRepository = new MemberRepository(prisma);
  const userRepository = new UserRepository(prisma);
  const userService = new UserService(userRepository);
  const permissionService = new PermissionService(memberRepository, userService, organizationRepository);
  const eventService = new EventService(eventRepository, permissionService);
  return { eventService };
}

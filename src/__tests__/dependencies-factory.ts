import { PrismaClient } from "@prisma/client";
import {
  MockOpenIdClient,
  newMockOpenIdClient,
} from "~/__tests__/mocks/openIdClient.js";
import { ApolloServerDependencies } from "~/lib/apollo-server.js";
import {
  ServerDependencies,
  dependenciesFactory,
} from "~/lib/fastify/dependencies.js";
import { MemberRepository } from "~/repositories/organizations/members.js";
import { OrganizationRepository } from "~/repositories/organizations/organizations.js";
import { UserRepository } from "~/repositories/users/index.js";
import { AuthService } from "~/services/auth/service.js";
import { PermissionService } from "~/services/permissions/service.js";
import { UserService } from "~/services/users/service.js";

export function defaultTestDependenciesFactory(
  overrides: Partial<{
    apolloServerDependencies: Partial<ApolloServerDependencies>;
    authService: AuthService;
    prismaClient: PrismaClient;
    openIdClient: MockOpenIdClient;
  }> = {},
): ServerDependencies & { mockOpenIdClient: MockOpenIdClient } {
  const defaultDependencies = dependenciesFactory();
  const {
    prismaClient: prismaOverride,
    apolloServerDependencies: apolloServerOverrides,
  } = overrides;
  const prismaClient = prismaOverride ?? defaultDependencies.prisma;

  const { openIdClient = newMockOpenIdClient() } = overrides;
  const { apolloServerDependencies: serviceOverrides = {} } = overrides;

  const memberRepository = new MemberRepository(prismaClient);
  const organizationRepository = new OrganizationRepository(prismaClient);
  const userRepository = new UserRepository(prismaClient);
  const {
    permissionService = new PermissionService(
      memberRepository,
      userRepository,
      organizationRepository,
    ),
  } = serviceOverrides;
  const { userService = new UserService(userRepository, permissionService) } =
    serviceOverrides;
  const { authService = new AuthService(userService, openIdClient) } =
    overrides;

  const defaultApolloServerOverrides: Partial<ApolloServerDependencies> = {
    userService,
    permissionService,
  };

  const apolloServerDependencies: ApolloServerDependencies = {
    ...defaultDependencies.apolloServerDependencies,
    ...defaultApolloServerOverrides,
    ...apolloServerOverrides,
  };

  return {
    ...defaultDependencies,
    authService,
    mockOpenIdClient: openIdClient,
    apolloServerDependencies,
    prisma: prismaClient,
  };
}

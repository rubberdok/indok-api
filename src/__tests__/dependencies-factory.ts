import { faker } from "@faker-js/faker";
import { PrismaClient } from "@prisma/client";

import { ApolloServerDependencies } from "@/lib/apollo-server.js";
import { ServerDependencies, dependenciesFactory } from "@/lib/fastify/dependencies.js";
import { MemberRepository } from "@/repositories/organizations/members.js";
import { OrganizationRepository } from "@/repositories/organizations/organizations.js";
import { UserRepository } from "@/repositories/users/index.js";
import { AuthClient, UserInfo } from "@/services/auth/clients.js";
import { FeideProvider } from "@/services/auth/providers.js";
import { AuthService } from "@/services/auth/service.js";
import { PermissionService } from "@/services/permissions/service.js";
import { UserService } from "@/services/users/service.js";

export class MockFeideClient implements AuthClient {
  constructor(private userId?: string) {}

  fetchUserInfo(): Promise<UserInfo> {
    return Promise.resolve({
      sub: this.userId ?? faker.string.uuid(),
      name: faker.person.fullName(),
      "dataporten-userid_sec": [faker.internet.email()],
      email: faker.internet.email(),
    });
  }
  fetchAccessToken(): Promise<string> {
    return Promise.resolve(faker.string.uuid());
  }
}

export function defaultTestDependenciesFactory(
  overrides: Partial<{
    apolloServerDependencies: Partial<ApolloServerDependencies>;
    authService: AuthService;
    prismaClient: PrismaClient;
    feideClient: AuthClient;
  }> = {}
): ServerDependencies {
  const defaultDependencies = dependenciesFactory();
  const { prismaClient: prismaOverride, apolloServerDependencies: apolloServerOverrides } = overrides;
  const prismaClient = prismaOverride ?? defaultDependencies.prisma;

  const { feideClient = new MockFeideClient() } = overrides;
  const { apolloServerDependencies: serviceOverrides = {} } = overrides;

  const memberRepository = new MemberRepository(prismaClient);
  const organizationRepository = new OrganizationRepository(prismaClient);
  const userRepository = new UserRepository(prismaClient);
  const { permissionService = new PermissionService(memberRepository, userRepository, organizationRepository) } =
    serviceOverrides;
  const { userService = new UserService(userRepository, permissionService) } = serviceOverrides;
  const { authService = new AuthService(userService, feideClient, FeideProvider) } = overrides;

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
    apolloServerDependencies,
    prisma: prismaClient,
  };
}

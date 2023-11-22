import { faker } from "@faker-js/faker";
import { merge } from "lodash-es";

import { dependenciesFactory, ServerDependencies } from "@/lib/fastify/dependencies.js";
import prisma from "@/lib/prisma.js";
import { UserRepository } from "@/repositories/users/index.js";
import { AuthClient, UserInfo } from "@/services/auth/clients.js";
import { FeideProvider } from "@/services/auth/providers.js";
import { AuthService } from "@/services/auth/service.js";
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
  serivceOverrides: Partial<ServerDependencies["apolloServerDependencies"]> & {
    authService?: ServerDependencies["authService"];
  } = {},
  feideClient: AuthClient = new MockFeideClient()
): ReturnType<typeof dependenciesFactory> {
  const defaultDependencies = dependenciesFactory();

  const userRepository = new UserRepository(prisma);
  const userService = new UserService(userRepository, defaultDependencies.apolloServerDependencies.permissionService);
  const authService = new AuthService(userService, feideClient, FeideProvider);
  const { authService: authServiceOverride, ...apolloServerOverrides } = serivceOverrides;

  const apolloServerDependencies = merge({}, { userService }, apolloServerOverrides);

  return dependenciesFactory({ apolloServerDependencies, authService: authServiceOverride ?? authService });
}

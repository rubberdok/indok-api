import { faker } from "@faker-js/faker";
import { merge } from "lodash-es";

import prisma from "@/lib/prisma.js";
import { UserRepository } from "@/repositories/users/index.js";
import { Dependencies, dependenciesFactory } from "@/server.js";
import { AuthClient, UserInfo } from "@/services/auth/clients.js";
import { FeideProvider } from "@/services/auth/providers.js";
import { AuthService } from "@/services/auth/service.js";
import { UserService } from "@/services/users/service.js";

class MockFeideClient implements AuthClient {
  fetchUserInfo(): Promise<UserInfo> {
    return Promise.resolve({
      sub: faker.string.uuid(),
      name: faker.person.fullName(),
      "dataporten-userid_sec": [faker.internet.email()],
      email: faker.internet.email(),
    });
  }
  fetchAccessToken(): Promise<string> {
    return Promise.resolve(faker.string.uuid());
  }
}

export function defaultTestDependenciesFactory(overrides?: Partial<Dependencies>) {
  const mockFeideClient = new MockFeideClient();
  const userRepository = new UserRepository(prisma);
  const userService = new UserService(userRepository);
  const authService = new AuthService(userService, mockFeideClient, FeideProvider);
  const dependencies = merge({}, dependenciesFactory({ authService, userService }), overrides);
  return dependencies;
}

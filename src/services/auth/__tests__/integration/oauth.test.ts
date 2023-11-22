import { PrismaClient } from "@prisma/client";

import { defaultTestDependenciesFactory } from "@/__tests__/dependencies-factory.js";
import { User } from "@/domain/users.js";
import prisma from "@/lib/prisma.js";

import { FeideProvider } from "../../providers.js";
import { AuthService, UserService as IUserService } from "../../service.js";
import { FeideResponses, setupMockFeideClient } from "../__mocks__/feide.js";

let authService: AuthService;
let userService: IUserService;
let db: PrismaClient;

describe("OAuth", () => {
  beforeAll(() => {
    db = prisma;
    ({
      apolloServerDependencies: { userService },
    } = defaultTestDependenciesFactory());
  });

  beforeEach(() => {
    db.user.delete({
      where: {
        id: "new_id",
      },
    });

    db.user.upsert({
      where: {
        id: "existing_id",
      },
      update: {
        username: "new",
        feideId: "new_id",
        firstName: "first",
        lastName: "last",
        email: "new@example.com",
      },
      create: {
        username: "new",
        feideId: "new_id",
        firstName: "first",
        lastName: "last",
        email: "new@example.com",
      },
    });
  });

  interface TestCase {
    name: string;
    responses: FeideResponses;
    expected: Pick<User, "email" | "feideId" | "firstName" | "lastName" | "username">;
  }

  const cases: TestCase[] = [
    {
      name: "should create a new user if one does not exist",
      responses: {
        token: {
          status: 200,
          data: {
            access_token: "access_token",
            id_token: "id_token",
          },
        },
        userInfo: {
          status: 200,
          data: {
            sub: "new_id",
            name: "first last",
            "dataporten-userid_sec": ["new@ntnu.no"],
            email: "new@example.com",
          },
        },
      },
      expected: {
        username: "new",
        feideId: "new_id",
        firstName: "first",
        lastName: "last",
        email: "new@example.com",
      },
    },
    {
      name: "should fetch an existing user",
      responses: {
        token: {
          status: 200,
          data: {
            access_token: "access_token",
            id_token: "id_token",
          },
        },
        userInfo: {
          status: 200,
          data: {
            sub: "existing_id",
            name: "first last",
            "dataporten-userid_sec": ["existing@ntnu.no"],
            email: "existing@example.com",
          },
        },
      },
      expected: {
        username: "existing",
        feideId: "existing_id",
        firstName: "first",
        lastName: "last",
        email: "existing@example.com",
      },
    },
  ];
  test.each(cases)("authentication - $name", async ({ responses, expected }) => {
    authService = new AuthService(userService, setupMockFeideClient({ responses }), FeideProvider);

    const { username, feideId, firstName, lastName, email } = await authService.getUser({
      code: "code",
      codeVerifier: "verifier",
    });

    expect({ username, feideId, firstName, lastName, email }).toEqual(expected);
  });
});

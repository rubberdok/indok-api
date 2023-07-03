import fetch, { Response as _Response } from "node-fetch";

import { Database } from "@/core/index.js";
import prisma from "@/lib/prisma.js";
import { UserRepository } from "@/repositories/users/index.js";
import { FeideService } from "@/services/auth/index.js";
import { IAuthService } from "@/services/interfaces.js";
import { UserService } from "@/services/users/index.js";

import { setupMocks } from "../__mocks__/feide.js";

import { OAuthCase } from "./interfaces.js";

const { Response: ActualResponse } = jest.requireActual<{
  Response: typeof _Response;
}>("node-fetch");

jest.mock("node-fetch");

let authService: IAuthService;
let db: Database;

describe("OAuth", () => {
  beforeAll(() => {
    db = prisma;
    const userRepository = new UserRepository(db);
    const userService = new UserService(userRepository);
    authService = new FeideService(userService);
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

  const cases: OAuthCase[] = [
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
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

    mockFetch.mockImplementation((url) => {
      const { json, status } = setupMocks(url, responses);
      const res = new ActualResponse(undefined, { status });
      res.json = json;
      return Promise.resolve(res);
    });

    const { username, feideId, firstName, lastName, email } = await authService.getUser({
      code: "code",
      codeVerifier: "verifier",
    });

    expect({ username, feideId, firstName, lastName, email }).toEqual(expected);
  });
});

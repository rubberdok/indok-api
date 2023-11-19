import assert from "assert";

import { faker } from "@faker-js/faker";
import { FastifyInstance, InjectOptions } from "fastify";

import { defaultTestDependenciesFactory } from "@/__tests__/dependenciesFactory.js";
import { env } from "@/config.js";
import { codes } from "@/domain/errors.js";
import prisma from "@/lib/prisma.js";
import { UserRepository } from "@/repositories/users/index.js";
import { initServer } from "@/server.js";
import { UserService } from "@/services/users/service.js";

import { AuthClient, UserInfo } from "../../clients.js";
import { FeideProvider } from "../../providers.js";
import { AuthService } from "../../service.js";

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

describe("AuthPlugin", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const userRepository = new UserRepository(prisma);
    const userService = new UserService(userRepository);
    const authService = new AuthService(userService, new MockFeideClient(), FeideProvider);
    const dependencies = defaultTestDependenciesFactory({ authService, userService });
    app = await initServer(dependencies, { port: 4001, host: "0.0.0.0" });
  });

  describe("GET /auth/login", () => {
    it("should generate a login url with PKCE params", async () => {
      const result = await performSSORedirect(app);

      expect(result.statusCode).toBe(303);
      expect(result.headers.location).toContain("code_challenge=");
      expect(result.headers.location).toContain("code_challenge_method=S256");
    });

    it("should include the state from the original request", async () => {
      const result = await performSSORedirect(app, "https://example.com");
      expect(result.headers.location).toContain(encodeURIComponent("https://example.com"));
    });

    it("should set session cookie", async () => {
      const result = await performSSORedirect(app);

      expect(result.cookies).toContainEqual({
        domain: env.SESSION_COOKIE_DOMAIN,
        name: env.SESSION_COOKIE_NAME,
        value: expect.any(String),
        path: "/",
        httpOnly: env.SESSION_COOKIE_HTTP_ONLY,
        sameSite: "None",
        expires: expect.any(Date),
      });
    });
  });

  describe("GET /auth/authenticate", () => {
    it("should error if code verifier is not found in session", async () => {
      const result = await performOAuthAuthentication(app, "code");

      expect(result.statusCode).toBe(400);
      expect(result.json()).toEqual({
        code: codes.ERR_BAD_REQUEST,
        error: "Bad Request",
        message: "Code verifier not found in session",
        statusCode: 400,
      });
    });

    it("should use the code verifier from the session to validate the response", async () => {
      const result = await performLogin(app);
      expect(result.statusCode).toBe(303);
    });

    it("should require code in query params", async () => {
      const result = await performOAuthAuthentication(app);

      expect(result.statusCode).toBe(400);
      expect(await result.json()).toEqual({
        statusCode: 400,
        code: "FST_ERR_VALIDATION",
        error: "Bad Request",
        message: expect.any(String),
      });
    });

    it("should regenerate session on login", async () => {
      const redirectResult = await performSSORedirect(app);

      const sessionCookie = redirectResult.cookies[0]?.value;
      assert(sessionCookie !== undefined);

      /**
       * Assert that the session cookie is regenerated on login
       * to prevent session fixation attacks.
       */
      const authenticateResult = await performOAuthAuthentication(app, "code", sessionCookie);
      const authenticatedSessionCookie = authenticateResult.cookies[0]?.value;
      assert(authenticatedSessionCookie !== undefined);
      expect(authenticatedSessionCookie).not.toEqual(sessionCookie);

      const unauthenticatedMeResult = await performMe(app, sessionCookie);
      expect(unauthenticatedMeResult.statusCode).toBe(401);

      const meResult = await performMe(app, authenticatedSessionCookie);
      expect(meResult.statusCode).toBe(200);
    });
  });

  describe("POST /auth/logout", () => {
    it("should clear session", async () => {
      const loginResult = await performLogin(app);
      const authenticatedSessionCookie = loginResult.cookies[0]?.value;

      const logoutResult = await performLogout(app, authenticatedSessionCookie);
      const meResult = await performMe(app, authenticatedSessionCookie);
      expect(logoutResult.statusCode).toBe(303);
      expect(meResult.statusCode).toBe(401);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});

function performSSORedirect(app: FastifyInstance, state?: string) {
  if (state) {
    return app.inject({
      method: "GET",
      url: `/auth/login?state=${encodeURIComponent(state)}`,
    });
  }
  return app.inject({
    method: "GET",
    url: "/auth/login",
  });
}

async function performLogin(app: FastifyInstance) {
  const ssoRedirect = await performSSORedirect(app);
  const sessionCookie = ssoRedirect.cookies[0]?.value;

  return performOAuthAuthentication(app, "code", sessionCookie);
}

function performOAuthAuthentication(app: FastifyInstance, code?: string, sessionCookie?: string) {
  let cookies: InjectOptions["cookies"] = {};
  if (sessionCookie) {
    cookies = {
      [env.SESSION_COOKIE_NAME]: sessionCookie,
    };
  }

  if (code) {
    return app.inject({
      method: "GET",
      url: `/auth/authenticate?code=${code}`,
      cookies,
    });
  }
  return app.inject({
    method: "GET",
    url: "/auth/authenticate",
    cookies,
  });
}

function performLogout(app: FastifyInstance, sessionCookie?: string) {
  let cookies: InjectOptions["cookies"] = {};
  if (sessionCookie) {
    cookies = {
      [env.SESSION_COOKIE_NAME]: sessionCookie,
    };
  }
  return app.inject({
    method: "POST",
    url: "/auth/logout",
    cookies,
  });
}

function performMe(app: FastifyInstance, sessionCookie?: string) {
  let cookies: InjectOptions["cookies"] = {};
  if (sessionCookie) {
    cookies = {
      [env.SESSION_COOKIE_NAME]: sessionCookie,
    };
  }
  return app.inject({
    method: "GET",
    url: "/auth/me",
    cookies,
  });
}

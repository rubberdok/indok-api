import { faker } from "@faker-js/faker";
import { FastifyRequest } from "fastify";
import { mockDeep } from "jest-mock-extended";

import { defaultTestDependenciesFactory } from "@/__tests__/dependencies-factory.js";
import prisma from "@/lib/prisma.js";

import { MockOpenIdClient, newMockOpenIdClient } from "../../../../__tests__/mocks/openIdClient.js";
import { AuthService } from "../../service.js";

describe("AuthService", () => {
  let authService: AuthService;
  let openIdClient: MockOpenIdClient;

  beforeAll(() => {
    openIdClient = newMockOpenIdClient();
    const {
      apolloServerDependencies: { userService },
    } = defaultTestDependenciesFactory({
      openIdClient: openIdClient,
    });
    authService = new AuthService(userService, openIdClient, "https://example.com");
  });
  describe("authorizationUrl", () => {
    it("should call openIdClient#authorizeUrl with the expected parameters", async () => {
      const req = mockDeep<FastifyRequest>();
      authService.authorizationUrl(req, "redirectionUrl");

      expect(openIdClient.authorizationUrl).toHaveBeenCalledWith({
        scope: expect.any(String),
        code_challenge: expect.any(String),
        code_challenge_method: "S256",
        state: "redirectionUrl",
      });
      expect(req.session.set).toHaveBeenCalledWith("codeVerifier", expect.any(String));
    });
  });

  describe("authorizationCallback", () => {
    it("should call openIdClient#callback and openIdClient#userinfo with the expected parameters", async () => {
      /**
       * Arrange
       *
       * 1. Mock the FastifyRequest
       * 2. Mock the data returned by the OpenIDClient
       */

      const req = mockDeep<FastifyRequest>();
      req.session.get.mockReturnValue("codeVerifier");
      const data = { code: "code" };
      const user = {
        id: faker.string.uuid(),
        email: faker.internet.exampleEmail({ firstName: faker.string.uuid() }),
        name: faker.person.fullName(),
      };

      openIdClient.updateUserResponseMock(user);

      await authService.authorizationCallback(req, data);

      expect(openIdClient.callback).toHaveBeenCalledWith("https://example.com", data, {
        code_verifier: "codeVerifier",
      });
      expect(openIdClient.userinfo).toHaveBeenCalled();
    });

    it("should create a new user if a user with the given feideId does not already exist", async () => {
      /**
       * Arrange
       *
       * 1. Mock the FastifyRequest
       * 2. Mock the data returned by the OpenIDClient
       */

      const req = mockDeep<FastifyRequest>();
      req.session.get.mockReturnValue("codeVerifier");
      const data = { code: "code" };
      const user = {
        id: faker.string.uuid(),
        email: faker.internet.exampleEmail({ firstName: faker.string.uuid() }),
        name: faker.person.fullName(),
      };

      openIdClient.updateUserResponseMock(user);

      const actual = await authService.authorizationCallback(req, data);

      expect(actual.feideId).toBe(user.id);
      expect(actual.firstName).toBe(user.name.split(" ")[0]);
      expect(actual.lastName).toBe(user.name.split(" ")[1]);
      expect(actual.email).toBe(user.email);
      expect(actual.username).toBe(user.email.split("@")[0]);
      expect(actual.createdAt).toEqual(actual.updatedAt);
    });

    it("should return the existing user with the feide ID if it exists", async () => {
      /**
       * Arrange
       *
       * 1. Mock the FastifyRequest
       * 2. Mock the data returned by the OpenIDClient
       * 3. Create an existing user with the given Feide ID
       */

      const req = mockDeep<FastifyRequest>();
      req.session.get.mockReturnValue("codeVerifier");
      const data = { code: "code" };
      const user = {
        id: faker.string.uuid(),
        email: faker.internet.exampleEmail({ firstName: faker.string.uuid() }),
        name: faker.person.fullName(),
      };
      const expected = await prisma.user.create({
        data: {
          feideId: user.id,
          email: user.email,
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          username: faker.string.sample(),
        },
      });

      openIdClient.updateUserResponseMock(user);

      const actual = await authService.authorizationCallback(req, data);

      expect(actual.id).toBe(expected.id);
      expect(actual.feideId).toBe(expected.feideId);
      expect(actual.firstName).toBe(expected.firstName);
      expect(actual.lastName).toBe(expected.lastName);
      expect(actual.email).toBe(expected.email);
      expect(actual.username).toBe(expected.username);
      expect(actual.updatedAt).toEqual(expected.updatedAt);
    });
  });
});

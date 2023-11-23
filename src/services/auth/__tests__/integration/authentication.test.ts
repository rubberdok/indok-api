import { faker } from "@faker-js/faker";
import { jest } from "@jest/globals";
import { FastifyRequest } from "fastify";
import { DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import { DateTime } from "luxon";

import { defaultTestDependenciesFactory } from "@/__tests__/dependencies-factory.js";
import { AuthenticationError } from "@/domain/errors.js";
import { User } from "@/domain/users.js";

import { AuthClient } from "../../clients.js";
import { FeideProvider } from "../../providers.js";
import { AuthService, UserService } from "../../service.js";

describe("AuthService", () => {
  let authService: AuthService;
  let feideClient: DeepMockProxy<AuthClient>;
  let userService: UserService;

  beforeAll(() => {
    jest.useFakeTimers();
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  beforeAll(() => {
    feideClient = mock<AuthClient>();
    ({
      apolloServerDependencies: { userService },
    } = defaultTestDependenciesFactory());
    authService = new AuthService(userService, feideClient, FeideProvider);
  });

  describe("getOAuthLoginUrl", () => {
    it("should return a url with PKCE query parameters", () => {
      const req = mockDeep<FastifyRequest>();
      const { url } = authService.getOAuthLoginUrl(req);

      expect(url).toContain("code_challenge_method=S256");
      expect(url).toContain("code_challenge=");
      expect(req.session.set).toHaveBeenCalledWith("codeVerifier", expect.any(String));
    });

    it("should return a url with state", () => {
      const req = mockDeep<FastifyRequest>();
      const { url } = authService.getOAuthLoginUrl(req, "https://example.com");

      expect(url).toContain(`state=${encodeURIComponent("https://example.com")}`);
      expect(req.session.set).toHaveBeenCalledWith("codeVerifier", expect.any(String));
    });
  });

  describe("getOrCreateUser", () => {
    it("should create a new user if one does not exist", async () => {
      /**
       * Arrange
       *
       * Set up a feide user Id for a user that does not exist in the database
       * mock return values for the feide client and the request session
       */
      const feideUserId = faker.string.uuid();
      const code = faker.string.uuid();
      const req = mockDeep<FastifyRequest>();
      req.session.get.mockReturnValueOnce("code_verifier");
      feideClient.fetchAccessToken.mockResolvedValueOnce("access_token");
      feideClient.fetchUserInfo.mockResolvedValueOnce({
        sub: feideUserId,
        name: faker.person.fullName(),
        "dataporten-userid_sec": [faker.internet.email()],
        email: faker.internet.email(),
      });

      /**
       * Act
       *
       * Call the getOrCreateUser method
       */
      const user = await authService.getOrCreateUser(req, { code });

      /**
       * Assert
       *
       * Check that the user has been created
       * Check that the user has the correct feide user id
       * Expect the feide client calls to have been made with the correct parameters
       */
      expect(user).toBeDefined();
      expect(user.feideId).toEqual(feideUserId);
      expect(feideClient.fetchAccessToken).toHaveBeenCalledWith({
        authorization: expect.stringContaining("Basic"),
        url: expect.stringContaining("token"),
        body: expect.any(URLSearchParams),
      });
      expect(feideClient.fetchUserInfo).toHaveBeenCalledWith({
        accessToken: "access_token",
        url: expect.stringContaining("userinfo"),
      });
    });

    it("should retrieve an existing user if it exists", async () => {
      /**
       * Arrange
       *
       * Set up a feide user Id for a user that does not exist in the database
       * mock return values for the feide client and the request session
       * Create a user in the database with the feide user id
       */
      const feideUserId = faker.string.uuid();
      const expected = await userService.create({
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        feideId: feideUserId,
        username: faker.internet.userName(),
      });
      const code = faker.string.uuid();
      const req = mockDeep<FastifyRequest>();
      req.session.get.mockReturnValueOnce("code_verifier");
      feideClient.fetchAccessToken.mockResolvedValueOnce("access_token");
      feideClient.fetchUserInfo.mockResolvedValueOnce({
        sub: feideUserId,
        name: faker.person.fullName(),
        "dataporten-userid_sec": [faker.internet.email()],
        email: faker.internet.email(),
      });

      /**
       * Act
       *
       * Call the getOrCreateUser method
       */
      const actual = await authService.getOrCreateUser(req, { code });

      /**
       * Assert
       *
       * Check that the user has been created
       * Check that the user has the correct feide user id
       * Expect the feide client calls to have been made with the correct parameters
       */
      expect(actual).toEqual(expected);
      expect(feideClient.fetchAccessToken).toHaveBeenCalledWith({
        authorization: expect.stringContaining("Basic"),
        url: expect.stringContaining("token"),
        body: expect.any(URLSearchParams),
      });
      expect(feideClient.fetchUserInfo).toHaveBeenCalledWith({
        accessToken: "access_token",
        url: expect.stringContaining("userinfo"),
      });
    });
  });

  describe("login", () => {
    it("should regenerate the session and set userId and authenticate", async () => {
      const user = await userService.create({
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        feideId: faker.string.uuid(),
        username: faker.string.sample(),
      });

      jest.setSystemTime(DateTime.now().plus({ minutes: 5 }).toJSDate());
      const req = mockDeep<FastifyRequest>();
      const actual = await authService.login(
        req,
        mock<User>({
          id: user.id,
        })
      );

      expect(req.session.regenerate).toHaveBeenCalledWith(["authenticated", "userId"]);
      expect(req.session.set).toHaveBeenCalledWith("authenticated", true);
      expect(req.session.set).toHaveBeenCalledWith("userId", user.id);
      expect(actual.id).toEqual(user.id);
      expect(actual.lastLogin).not.toEqual(user.lastLogin);
    });
  });

  describe("logout", () => {
    it("should destroy the session if authenticated", async () => {
      const req = mockDeep<FastifyRequest>({ session: { authenticated: true, userId: faker.string.uuid() } });
      req.session.get.mockImplementation((key) => req.session[key]);
      await authService.logout(req);

      expect(req.session.destroy).toHaveBeenCalled();
    });

    it("should throw AuthenticationError if not logged in", async () => {
      const req = mockDeep<FastifyRequest>({ session: { authenticated: false } });
      req.session.get.mockImplementation((key) => req.session[key]);

      const actual = authService.logout(req);

      await expect(actual).rejects.toThrow(AuthenticationError);
    });
  });
});

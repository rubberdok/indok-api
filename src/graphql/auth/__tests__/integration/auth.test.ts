import assert from "assert";

import { faker } from "@faker-js/faker";

import { env } from "@/config.js";
import { codes } from "@/domain/errors.js";
import { GraphQLTestClient } from "@/graphql/test-clients/graphqlTestClient.js";
import { graphql } from "@/graphql/test-clients/integration/gql.js";
import postmark from "@/lib/postmark.js";
import prisma from "@/lib/prisma.js";
import { createRedisClient } from "@/lib/redis.js";
import { CabinRepository } from "@/repositories/cabins/index.js";
import { MemberRepository } from "@/repositories/organizations/members.js";
import { OrganizationRepository } from "@/repositories/organizations/organizations.js";
import { UserRepository } from "@/repositories/users/index.js";
import { initServer } from "@/server.js";
import { AuthClient, UserInfo } from "@/services/auth/clients.js";
import { AuthService } from "@/services/auth/index.js";
import { FeideProvider } from "@/services/auth/providers.js";
import { CabinService } from "@/services/cabins/index.js";
import { MailService } from "@/services/mail/index.js";
import { OrganizationService } from "@/services/organizations/index.js";
import { UserService } from "@/services/users/index.js";

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

describe("Auth GraphQL", () => {
  let server: Awaited<ReturnType<typeof initServer>>;
  let graphqlClient: GraphQLTestClient;

  beforeAll(async () => {
    const cabinRepository = new CabinRepository(prisma);
    const userRepository = new UserRepository(prisma);
    const memberRepository = new MemberRepository(prisma);
    const organizationRepository = new OrganizationRepository(prisma);

    const mailService = new MailService(postmark, env.NO_REPLY_EMAIL);
    const cabinService = new CabinService(cabinRepository, mailService);
    const userService = new UserService(userRepository);
    const authService = new AuthService(userService, new MockFeideClient(), FeideProvider);
    const organizationService = new OrganizationService(organizationRepository, memberRepository, userService);

    const dependencies = {
      cabinService,
      userService,
      authService,
      organizationService,
      createRedisClient: createRedisClient,
    };
    server = await initServer(dependencies, { port: env.PORT, host: "0.0.0.0" });
    graphqlClient = new GraphQLTestClient(server);
  });

  describe("authentication flow", () => {
    it("should return a valid redirect url", async () => {
      const { data } = await graphqlClient.mutate({
        mutation: graphql(`
          mutation redirectUrl {
            redirectUrl {
              url
            }
          }
        `),
      });
      expect(data).toEqual({
        redirectUrl: {
          url: expect.stringContaining("https://auth.dataporten.no/oauth/authorization"),
        },
      });
    });

    it("should include a session id cookie", async () => {
      const res = await graphqlClient.mutate({
        mutation: graphql(`
          mutation redirectUrl {
            redirectUrl {
              url
            }
          }
        `),
      });

      expect(res.response.cookies).toHaveLength(1);
      expect(res.response.cookies).toContainEqual({
        domain: env.SESSION_COOKIE_DOMAIN,
        name: env.SESSION_COOKIE_NAME,
        value: expect.any(String),
        path: "/",
        httpOnly: env.SESSION_COOKIE_HTTP_ONLY,
        sameSite: "None",
        expires: expect.any(Date),
      });
    });

    describe("authenticate", () => {
      it("should error if code verifier is not found in session", async () => {
        const result = graphqlClient.mutate({
          mutation: graphql(`
            mutation authenticate1 {
              authenticate(code: "code") {
                user {
                  id
                }
              }
            }
          `),
        });
        await expect(result).resolves.toHaveProperty("errors");
      });

      it("use the code verifier from the session to validate the response", async () => {
        const fakeAccessToken = faker.string.uuid();

        const redirect = await graphqlClient.mutate({
          mutation: graphql(`
            mutation redirectUrl {
              redirectUrl {
                url
              }
            }
          `),
        });

        const sessionCookie = redirect.response.cookies[0]?.value;
        assert(typeof sessionCookie !== "undefined");

        const { data } = await graphqlClient.mutate(
          {
            mutation: graphql(`
              mutation authenticate($code: String!) {
                authenticate(code: $code) {
                  user {
                    id
                  }
                }
              }
            `),
            variables: { code: fakeAccessToken },
          },
          { cookies: { [env.SESSION_COOKIE_NAME]: sessionCookie } }
        );

        expect(data?.authenticate.user?.id).toBeDefined();
      });

      it("regenerate session on login", async () => {
        const fakeAccessToken = faker.string.uuid();

        const redirect = await graphqlClient.mutate({
          mutation: graphql(`
            mutation redirectUrl {
              redirectUrl {
                url
              }
            }
          `),
        });

        const sessionCookie = redirect.response.cookies[0]?.value;
        assert(typeof sessionCookie !== "undefined");

        const { data, response } = await graphqlClient.mutate(
          {
            mutation: graphql(`
              mutation authenticate($code: String!) {
                authenticate(code: $code) {
                  user {
                    id
                  }
                }
              }
            `),
            variables: { code: fakeAccessToken },
          },
          { cookies: { [env.SESSION_COOKIE_NAME]: sessionCookie } }
        );

        expect(data?.authenticate.user?.id).toBeDefined();
        expect(response.cookies[0]?.value).not.toEqual(sessionCookie);
      });
    });
  });

  describe("logout", () => {
    it("should raise error if not authenticated", async () => {
      const { errors } = await graphqlClient.mutate({
        mutation: graphql(`
          mutation logout {
            logout {
              status
            }
          }
        `),
      });
      assert(typeof errors !== "undefined");
      expect(errors[0]?.extensions.code).toEqual(codes.ERR_BAD_REQUEST);
    });

    it("should regenerate session on logout", async () => {
      const {
        response: { cookies },
      } = await graphqlClient.mutate({
        mutation: graphql(`
          mutation redirectUrl {
            redirectUrl {
              url
            }
          }
        `),
      });
      const sessionCookie = cookies[0]?.value;
      assert(typeof sessionCookie !== "undefined");

      const { response } = await graphqlClient.mutate(
        {
          mutation: graphql(`
            mutation authenticate($code: String!) {
              authenticate(code: $code) {
                user {
                  id
                }
              }
            }
          `),
          variables: { code: faker.string.uuid() },
        },
        { cookies: { [env.SESSION_COOKIE_NAME]: sessionCookie } }
      );

      const loggedInSessionCookie = response.cookies[0]?.value;
      assert(typeof loggedInSessionCookie !== "undefined");

      const {
        errors,
        data,
        response: logoutResponse,
      } = await graphqlClient.mutate(
        {
          mutation: graphql(`
            mutation logout {
              logout {
                status
              }
            }
          `),
        },
        { cookies: { [env.SESSION_COOKIE_NAME]: loggedInSessionCookie } }
      );
      expect(errors).toBeUndefined();
      expect(data).toEqual({
        logout: {
          status: "SUCCESS",
        },
      });
      expect(logoutResponse.cookies[0]?.value).not.toEqual(loggedInSessionCookie);
    });
  });

  afterAll(() => {
    server.close();
  });
});

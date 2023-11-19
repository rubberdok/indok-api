import { FastifyInstance } from "fastify";

import { defaultTestDependenciesFactory } from "@/__tests__/dependencies-factory.js";
import { GraphQLTestClient } from "@/graphql/test-clients/graphql-test-client.js";
import { graphql } from "@/graphql/test-clients/integration/gql.js";
import { initServer } from "@/server.js";

describe("Users", () => {
  let server: FastifyInstance;
  let testClient: GraphQLTestClient;

  beforeAll(async () => {
    const dependencies = defaultTestDependenciesFactory();
    server = await initServer(dependencies, { port: 4002, host: "0.0.0.0" });
    testClient = new GraphQLTestClient(server);
  });

  afterAll(() => {
    server.close();
  });

  describe("query user", () => {
    it("should return null if no user is logged in", async () => {
      const { data } = await testClient.query({
        query: graphql(`
          query me {
            user {
              user {
                id
              }
            }
          }
        `),
      });
      expect(data).toBeDefined();
      expect(data?.user.user).toBeNull();
    });

    it("should return the logged in user", async () => {
      const cookies = await testClient.performLogin();

      const { data } = await testClient.query(
        {
          query: graphql(`
            query loggedIn {
              user {
                user {
                  id
                }
              }
            }
          `),
        },
        {
          cookies,
        }
      );

      expect(data).toBeDefined();
      expect(data?.user.user).toEqual({
        id: expect.any(String),
      });
    });
  });
});

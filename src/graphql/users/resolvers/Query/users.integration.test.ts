import { faker } from "@faker-js/faker";

import { User } from "@/domain/users.js";
import { GraphQLTestClient, newGraphQLTestClient } from "@/graphql/test-clients/graphql-test-client.js";
import { graphql } from "@/graphql/test-clients/integration/gql.js";

describe("User queries", () => {
  let client: GraphQLTestClient;

  beforeAll(async () => {
    client = await newGraphQLTestClient({ port: 4374 });
  });

  afterAll(async () => {
    await client.close();
  });

  describe("users", () => {
    describe("as a super user", () => {
      it("should return all users, including sensitive information", async () => {
        /**
         * Arrange
         *
         * Create a super user
         * Create 3 additional users
         */
        fail();
      });
    });
  });

  function makeUser(data: Partial<{ isSuperUser: boolean }> = {}): Promise<User> {
    return client.dependencies.apolloServerDependencies.userService.create({
      feideId: faker.string.uuid(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      username: faker.string.sample(20),
      ...data,
    });
  }
});

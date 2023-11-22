import { faker } from "@faker-js/faker";

import { GraphQLTestClient, newGraphQLTestClient } from "@/graphql/test-clients/graphql-test-client.js";
import { graphql } from "@/graphql/test-clients/integration/gql.js";
import prisma from "@/lib/prisma.js";

describe("Organization mutations", () => {
  let client: GraphQLTestClient;

  beforeAll(async () => {
    client = await newGraphQLTestClient({ port: 4324 });
  });

  afterAll(async () => {
    await client.app.close();
  });

  describe("createOrganization", () => {
    describe("as a super user", () => {
      it("should create an organization with feature permissions", async () => {
        /**
         * Arrange
         *
         * Create a super user
         * Mock feide to respond the super user's id
         */
        const feideId = faker.string.uuid();
        const user = await prisma.user.create({
          data: {
            feideId,
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            isSuperUser: true,
            email: faker.internet.email(),
            username: faker.string.sample(20),
          },
        });

        /**
         * Act
         *
         * Perform a mutation to create an organization
         */
        const { data, errors } = await client.mutate(
          {
            mutation: graphql(`
              mutation createOrganization($data: CreateOrganizationInput!) {
                createOrganization(data: $data) {
                  organization {
                    id
                    name
                    featurePermissions
                  }
                }
              }
            `),
            variables: {
              data: {
                name: faker.string.sample(20),
                featurePermissions: ["CABIN_BOOKING"],
              },
            },
          },
          {
            userId: user.id,
          }
        );

        /**
         * Assert
         *
         * The mutation should succeed, and the organization should be created with the feature permissions
         */
        expect(errors).toBeUndefined();
        expect(data).toBeDefined();
        expect(data?.createOrganization.organization.name).toEqual(expect.any(String));
        expect(data?.createOrganization.organization.featurePermissions).toEqual(["CABIN_BOOKING"]);
      });
    });
  });
});

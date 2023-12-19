import { faker } from "@faker-js/faker";
import { GraphQLError } from "graphql";
import { DeepMockProxy, mockDeep, mockFn } from "jest-mock-extended";

import { InternalServerError, errorCodes } from "@/domain/errors.js";
import { GraphQLTestClient, newGraphQLTestClient } from "@/graphql/test-clients/graphql-test-client.js";
import { graphql } from "@/graphql/test-clients/integration/gql.js";
import prisma from "@/lib/prisma.js";
import { OrganizationService } from "@/services/organizations/service.js";

describe("GraphQL error handling", () => {
  let client: GraphQLTestClient;
  let mockOrganizationService: DeepMockProxy<OrganizationService>;

  afterAll(async () => {
    await client.close();
  });

  beforeAll(async () => {
    mockOrganizationService = mockDeep<OrganizationService>();
    client = await newGraphQLTestClient(
      { port: 4388 },
      { apolloServerDependencies: { organizationService: mockOrganizationService } }
    );
  });

  it("should not report bad GraphQL request errors to Sentry", async () => {
    const mockSentryErrorHandler = mockFn();
    client.app.Sentry.captureException = mockSentryErrorHandler;

    const { errors } = await client.mutate({
      mutation: graphql(`
        mutation ErrorMutation($data: CreateOrganizationInput!) {
          createOrganization(data: $data) {
            organization {
              id
            }
          }
        }
      `),
      // variables are intentionally omitted to trigger a user-facing error
    });

    expect(errors).toHaveLength(1);
    expect(mockSentryErrorHandler).not.toHaveBeenCalled();
  });

  it("should report not permission denied errors to Sentry", async () => {
    const mockSentryErrorHandler = mockFn();
    client.app.Sentry.captureException = mockSentryErrorHandler;

    const { errors } = await client.query({
      query: graphql(`
        mutation SuperQuery($id: ID!, $data: SuperUpdateUserInput!) {
          superUpdateUser(id: $id, data: $data) {
            user {
              id
            }
          }
        }
      `),
      variables: {
        id: faker.string.uuid(),
        data: {
          isSuperUser: true,
        },
      },
    });

    expect(errors).toHaveLength(1);
    expect(mockSentryErrorHandler).not.toHaveBeenCalled();
  });

  it("should report unexpected errors to sentry", async () => {
    const userId = faker.string.uuid();
    await prisma.user.create({
      data: {
        id: userId,
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        username: faker.string.sample(20),
        feideId: faker.string.uuid(),
      },
    });
    const mockSentryErrorHandler = mockFn();
    client.app.Sentry.captureException = mockSentryErrorHandler;
    mockOrganizationService.findMany.mockRejectedValue(new InternalServerError("Test Internal Server Error"));

    const { errors } = await client.mutate(
      {
        mutation: graphql(`
          query ErrOrganizations {
            organizations {
              organizations {
                id
              }
            }
          }
        `),
      },
      { userId }
    );

    expect(mockOrganizationService.findMany).toHaveBeenCalled();
    expect(errors).toHaveLength(1);
    expect(errors?.some((error) => error.extensions.code === errorCodes.ERR_INTERNAL_SERVER_ERROR)).toBe(true);
    expect(mockSentryErrorHandler).toHaveBeenCalledWith(new GraphQLError("Test Internal Server Error"));
  });
});

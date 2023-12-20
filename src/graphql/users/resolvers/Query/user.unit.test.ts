import { faker } from "@faker-js/faker";
import { Organization } from "@prisma/client";
import { mock } from "jest-mock-extended";
import { User } from "~/domain/users.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("User queries", () => {
  describe("user", () => {
    it("should include organizations for the user", async () => {
      /**
       * Arrange
       *
       * Set up a mock user and organization and an authenticated context.
       */
      const { client, createMockContext, organizationService, userService } =
        createMockApolloServer();
      const userId = faker.string.uuid();
      const authenticatedContext = createMockContext({
        userId,
        authenticated: true,
      });
      const user = mock<User>({ id: userId });
      userService.get.mockResolvedValue(user);
      organizationService.findMany.mockResolvedValue([
        mock<Organization>({ id: faker.string.uuid() }),
      ]);

      /**
       * Act
       *
       * Call the user query.
       */
      const { errors, data } = await client.query(
        {
          query: graphql(`
            query UserWithOrganizations {
              user {
                user {
                  id
                  organizations {
                    id
                  }
                }
              }
            }
          `),
        },
        {
          contextValue: authenticatedContext,
        },
      );

      /**
       * Assert
       *
       * Ensure that the user query returned the expected data.
       */
      expect(errors).toBeUndefined();
      expect(data?.user.user?.organizations).toHaveLength(1);
      expect(data?.user.user?.organizations[0]?.id).toEqual(expect.any(String));
    });
  });
});

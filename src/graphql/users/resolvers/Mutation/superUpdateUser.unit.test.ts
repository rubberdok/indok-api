import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import { errorCodes } from "~/domain/errors.js";
import { User } from "~/domain/users.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("User mutations", () => {
  describe("superUpdateUser", () => {
    it("should update the user with ID passed as argument and authenticated user as caller", async () => {
      const { client, createMockContext, userService } =
        createMockApolloServer();
      const callerUserId = faker.string.uuid();
      const updateUserId = faker.string.uuid();
      const contextValue = createMockContext({
        userId: callerUserId,
        authenticated: true,
      });
      userService.superUpdateUser.mockResolvedValue(
        mock<User>({ id: updateUserId }),
      );

      const { errors } = await client.mutate(
        {
          mutation: graphql(`
            mutation SuperUpdateUser($id: ID!, $data: SuperUpdateUserInput!) {
              superUpdateUser(id: $id, data: $data) {
                user {
                  id
                }
              }
            }
          `),
          variables: {
            id: updateUserId,
            data: {
              isSuperUser: true,
            },
          },
        },
        {
          contextValue,
        },
      );

      expect(errors).toBeUndefined();
      expect(userService.superUpdateUser).toHaveBeenCalledWith(
        callerUserId,
        updateUserId,
        {
          isSuperUser: true,
        },
      );
    });

    it("should raise PermissionDeniedError if not authenticated", async () => {
      const { client, userService } = createMockApolloServer();

      const { errors } = await client.mutate({
        mutation: graphql(`
          mutation SuperUpdateUser($id: ID!, $data: SuperUpdateUserInput!) {
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

      expect(errors).toBeDefined();
      expect(
        errors?.some(
          (error) =>
            error.extensions?.code === errorCodes.ERR_PERMISSION_DENIED,
        ),
      ).toBe(true);
      expect(userService.superUpdateUser).not.toHaveBeenCalled();
    });
  });
});

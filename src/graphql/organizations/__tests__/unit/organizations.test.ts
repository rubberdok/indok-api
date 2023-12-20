import assert from "assert";
import { faker } from "@faker-js/faker";
import { ResultOf } from "@graphql-typed-document-node/core";
import { Organization } from "@prisma/client";
import { mock } from "jest-mock-extended";
import { errorCodes } from "~/domain/errors.js";
import { Role } from "~/domain/organizations.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";
import {
  AddMember2Document,
  RemoveMember2Document,
} from "~/graphql/test-clients/unit/graphql.js";

describe("OrganizationResolvers", () => {
  describe("Mutation", () => {
    describe("createOrganization", () => {
      it("should raise AuthenticationError if the user is not authenticated", async () => {
        /**
         * Arrange
         *
         * 1. Create a mock ApolloServer
         * 2. Create the mock context without a userId in session
         */
        const { createMockContext, client } = createMockApolloServer();
        const contextValue = createMockContext({ userId: undefined });

        /**
         * Act
         *
         * 1. Query the server with the createOrganization mutation
         */
        const { errors } = await client.mutate(
          {
            mutation: graphql(`
              mutation createOrganization1 {
                createOrganization(data: { name: "test" }) {
                  organization {
                    id
                  }
                }
              }
            `),
          },
          {
            contextValue,
          },
        );
        assert(typeof errors !== "undefined");
        expect(errors[0]?.extensions?.code).toBe(
          errorCodes.ERR_PERMISSION_DENIED,
        );
      });

      it("should call createOrganization if the user is authenticated", async () => {
        /**
         * Arrange
         *
         * 1. Create a mock ApolloServer
         * 2. Create the mock context without a userId in session
         */
        const { createMockContext, client, organizationService } =
          createMockApolloServer();
        const contextValue = createMockContext({
          userId: faker.string.uuid(),
          authenticated: true,
        });
        organizationService.create.mockResolvedValueOnce(
          mock<Organization>({
            id: faker.string.uuid(),
            name: "test",
            createdAt: new Date(),
            updatedAt: new Date(),
            description: "",
          }),
        );

        /**
         * Act
         *
         * 1. Query the server with the createOrganization mutation
         */
        const { data, errors } = await client.mutate(
          {
            mutation: graphql(`
              mutation createOrganization {
                createOrganization(data: { name: "test" }) {
                  organization {
                    id
                    name
                  }
                }
              }
            `),
          },
          {
            contextValue,
          },
        );
        expect(errors).toBeUndefined();
        expect(data).toBeDefined();
        expect(data).toEqual({
          createOrganization: {
            organization: {
              id: expect.any(String),
              name: "test",
            },
          },
        });
      });
    });

    describe("updateOrganization", () => {
      it("should raise AuthenticationError if the user is not authenticated", async () => {
        /**
         * Arrange
         *
         * 1. Create a mock ApolloServer
         * 2. Create the mock context without a userId in session
         */
        const { createMockContext, client } = createMockApolloServer();
        const contextValue = createMockContext({ userId: undefined });

        /**
         * Act
         *
         * 1. Query the server with the createOrganization mutation
         */
        const { errors } = await client.mutate(
          {
            mutation: graphql(`
              mutation updateOrganization1 {
                updateOrganization(data: { name: "test", id: "id" }) {
                  organization {
                    id
                  }
                }
              }
            `),
          },
          {
            contextValue,
          },
        );
        assert(typeof errors !== "undefined");
        expect(errors[0]?.extensions?.code).toBe(
          errorCodes.ERR_PERMISSION_DENIED,
        );
      });

      it("should call updateOrganization if the user is authenticated", async () => {
        /**
         * Arrange
         *
         * 1. Create a mock ApolloServer
         * 2. Create the mock context without a userId in session
         */
        const { createMockContext, client, organizationService } =
          createMockApolloServer();
        const contextValue = createMockContext({
          userId: faker.string.uuid(),
          authenticated: true,
        });
        organizationService.update.mockResolvedValueOnce(
          mock<Organization>({
            id: faker.string.uuid(),
            name: "test",
            createdAt: new Date(),
            updatedAt: new Date(),
            description: "",
          }),
        );

        /**
         * Act
         *
         * 1. Query the server with the createOrganization mutation
         */
        const { data, errors } = await client.mutate(
          {
            mutation: graphql(`
              mutation updateOrganization2 {
                updateOrganization(data: { name: "test", id: "id" }) {
                  organization {
                    id
                    name
                  }
                }
              }
            `),
          },
          {
            contextValue,
          },
        );
        expect(errors).toBeUndefined();
        expect(data).toBeDefined();
        expect(data).toEqual({
          updateOrganization: {
            organization: {
              id: expect.any(String),
              name: "test",
            },
          },
        });
      });
    });

    describe("addMember", () => {
      it("should raise AuthenticationError if the user is not authenticated", async () => {
        /**
         * Arrange
         *
         * 1. Create a mock ApolloServer
         * 2. Create the mock context without a userId in session
         */
        const { createMockContext, client } = createMockApolloServer();
        const contextValue = createMockContext({ userId: undefined });

        /**
         * Act
         *
         * 1. Query the server with the createOrganization mutation
         */
        const { errors } = await client.mutate(
          {
            mutation: graphql(`
              mutation addMember1 {
                addMember(data: { userId: "user", organizationId: "org" }) {
                  member {
                    id
                    organization {
                      members {
                        id
                      }
                    }
                  }
                }
              }
            `),
          },
          {
            contextValue,
          },
        );
        assert(typeof errors !== "undefined");
        expect(errors[0]?.extensions?.code).toBe(
          errorCodes.ERR_PERMISSION_DENIED,
        );
      });

      it("should call addMember if the user is authenticated", async () => {
        /**
         * Arrange
         *
         * 1. Create a mock ApolloServer
         * 2. Create the mock context without a userId in session
         */
        const { createMockContext, client, organizationService } =
          createMockApolloServer();
        const contextValue = createMockContext({
          userId: faker.string.uuid(),
          authenticated: true,
        });
        organizationService.addMember.mockResolvedValueOnce({
          id: faker.string.uuid(),
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: faker.string.uuid(),
          organizationId: faker.string.uuid(),
          role: Role.MEMBER,
        });
        organizationService.get.mockResolvedValueOnce(
          mock<Organization>({
            id: faker.string.uuid(),
            createdAt: new Date(),
            updatedAt: new Date(),
            name: "test",
            description: "",
          }),
        );
        organizationService.getMembers.mockResolvedValueOnce([
          {
            id: faker.string.uuid(),
            createdAt: new Date(),
            updatedAt: new Date(),
            role: Role.MEMBER,
            userId: faker.string.uuid(),
            organizationId: faker.string.uuid(),
          },
        ]);

        /**
         * Act
         *
         * 1. Query the server with the createOrganization mutation
         */
        const { data, errors } = await client.mutate(
          {
            mutation: graphql(`
              mutation addMember2 {
                addMember(data: { userId: "user", organizationId: "org" }) {
                  member {
                    id
                    organization {
                      id
                      members {
                        id
                      }
                    }
                  }
                }
              }
            `),
          },
          {
            contextValue,
          },
        );
        expect(errors).toBeUndefined();
        expect(data).toBeDefined();
        expect(data).toEqual<ResultOf<typeof AddMember2Document>>({
          addMember: {
            member: {
              id: expect.any(String),
              organization: {
                id: expect.any(String),
                members: [
                  {
                    id: expect.any(String),
                  },
                ],
              },
            },
          },
        });
      });
    });

    describe("removeMember", () => {
      it("should raise AuthenticationError if the user is not authenticated", async () => {
        /**
         * Arrange
         *
         * 1. Create a mock ApolloServer
         * 2. Create the mock context without a userId in session
         */
        const { createMockContext, client } = createMockApolloServer();
        const contextValue = createMockContext({ userId: undefined });

        /**
         * Act
         *
         * 1. Query the server with the createOrganization mutation
         */
        const { errors } = await client.mutate(
          {
            mutation: graphql(`
              mutation removeMember1 {
                removeMember(data: { id: "id" }) {
                  member {
                    id
                    organization {
                      members {
                        id
                      }
                    }
                  }
                }
              }
            `),
          },
          {
            contextValue,
          },
        );
        assert(typeof errors !== "undefined");
        expect(errors[0]?.extensions?.code).toBe(
          errorCodes.ERR_PERMISSION_DENIED,
        );
      });

      it("should call removeMember if the user is authenticated", async () => {
        /**
         * Arrange
         *
         * 1. Create a mock ApolloServer
         * 2. Create the mock context without a userId in session
         */
        const userId = faker.string.uuid();
        const { createMockContext, client, organizationService } =
          createMockApolloServer();
        const contextValue = createMockContext({ userId, authenticated: true });
        organizationService.removeMember.mockResolvedValueOnce({
          id: faker.string.uuid(),
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: faker.string.uuid(),
          organizationId: faker.string.uuid(),
          role: Role.MEMBER,
        });
        organizationService.get.mockResolvedValueOnce(
          mock<Organization>({
            id: faker.string.uuid(),
            createdAt: new Date(),
            updatedAt: new Date(),
            name: "test",
            description: "",
          }),
        );
        organizationService.getMembers.mockResolvedValueOnce([
          {
            id: faker.string.uuid(),
            createdAt: new Date(),
            updatedAt: new Date(),
            role: Role.MEMBER,
            userId: faker.string.uuid(),
            organizationId: faker.string.uuid(),
          },
        ]);

        /**
         * Act
         *
         * 1. Query the server with the createOrganization mutation
         */
        const { data, errors } = await client.mutate(
          {
            mutation: graphql(`
              mutation removeMember2 {
                removeMember(data: { id: "id" }) {
                  member {
                    id
                    organization {
                      id
                      members {
                        id
                      }
                    }
                  }
                }
              }
            `),
          },
          {
            contextValue,
          },
        );
        expect(errors).toBeUndefined();
        expect(data).toBeDefined();
        expect(organizationService.removeMember).toHaveBeenCalledWith(userId, {
          id: "id",
        });
        expect(data).toEqual<ResultOf<typeof RemoveMember2Document>>({
          removeMember: {
            member: {
              id: expect.any(String),
              organization: {
                id: expect.any(String),
                members: [
                  {
                    id: expect.any(String),
                  },
                ],
              },
            },
          },
        });
      });
    });
  });
});

import { faker } from "@faker-js/faker";
import { Event } from "@prisma/client";
import { mock } from "jest-mock-extended";

import { codes } from "@/domain/errors.js";
import { createMockApolloServer } from "@/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "@/graphql/test-clients/unit/gql.js";

describe("Event mutations", () => {
  describe("createEvent", () => {
    it("should create an event", async () => {
      /**
       * Arrange
       *
       * Create an authenticated context,
       * and set up the mock return value for the eventService.create method.
       */
      const { client, createMockContext, eventService } = createMockApolloServer();

      const contextValue = createMockContext({
        authenticated: true,
        userId: faker.string.uuid(),
      });

      eventService.create.mockResolvedValue(
        mock<Event>({ id: faker.string.uuid(), name: faker.person.fullName(), description: faker.lorem.paragraph() })
      );

      /**
       * Act
       *
       * Create an event using the authenticated context
       */
      const { errors } = await client.mutate(
        {
          mutation: graphql(`
            mutation createEvent($data: CreateEventInput!) {
              createEvent(data: $data) {
                event {
                  id
                  name
                  description
                }
              }
            }
          `),
          variables: {
            data: {
              organizationId: faker.string.uuid(),
              name: faker.person.fullName(),
              startAt: faker.date.future(),
              spots: 10,
              slots: [{ spots: 10 }, { spots: 10 }],
            },
          },
        },
        {
          contextValue,
        }
      );

      /**
       * Assert
       *
       * Ensure that the event creation was attempted with the correct arguments,
       * and that no errors were returned.
       */
      expect(errors).toBeUndefined();
      expect(eventService.create).toHaveBeenCalledWith(expect.any(String), expect.any(String), {
        name: expect.any(String),
        startAt: expect.any(Date),
        spots: 10,
        slots: [{ spots: 10 }, { spots: 10 }],
      });
    });

    it("should err if not logged in", async () => {
      const { client, createMockContext, eventService } = createMockApolloServer();

      const contextValue = createMockContext({
        authenticated: false,
        userId: undefined,
      });

      const { errors } = await client.mutate(
        {
          mutation: graphql(`
            mutation createEvent($data: CreateEventInput!) {
              createEvent(data: $data) {
                event {
                  id
                  name
                  description
                }
              }
            }
          `),
          variables: {
            data: {
              organizationId: faker.string.uuid(),
              name: faker.person.fullName(),
              description: faker.lorem.paragraph(),
              startAt: faker.date.future(),
            },
          },
        },
        {
          contextValue,
        }
      );

      /**
       * Assert
       *
       * Event creation was not attempted, and the mutation returned an error.
       */
      expect(errors).toBeDefined();
      expect(errors?.every((error) => error.extensions?.code === codes.ERR_PERMISSION_DENIED)).toBe(true);
      expect(eventService.create).not.toHaveBeenCalled();
    });
  });
});

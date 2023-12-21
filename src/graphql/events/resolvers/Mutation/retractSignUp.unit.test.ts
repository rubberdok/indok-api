import { faker } from "@faker-js/faker";
import { EventSignUp, ParticipationStatus } from "@prisma/client";
import { mock } from "jest-mock-extended";
import { errorCodes } from "~/domain/errors.js";
import { Event } from "~/domain/events.js";
import { User } from "~/domain/users.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Event mutations", () => {
  describe("retractSignUp", () => {
    it("should attempt to retract the sign up for the user on an event", async () => {
      /**
       * Arrange
       *
       * Create an authenticated context,
       * and set up the mock return value for the eventService.retractSignUp method,
       * and mock return values for eventSerivce.get and userService.get to test the resolvers.
       */
      const { client, createMockContext, eventService, userService } = createMockApolloServer();

      const contextValue = createMockContext({
        authenticated: true,
        userId: faker.string.uuid(),
      });

      eventService.retractSignUp.mockResolvedValue(
        mock<EventSignUp>({
          id: faker.string.uuid(),
          participationStatus: ParticipationStatus.RETRACTED,
        }),
      );
      eventService.get.mockResolvedValue(mock<Event>({ id: faker.string.uuid() }));
      userService.get.mockResolvedValue(mock<User>({ id: faker.string.uuid() }));

      /**
       * Act
       *
       * Retract the sign up for an event using the authenticated context
       */
      const { errors, data } = await client.mutate(
        {
          mutation: graphql(`
            mutation retractSignUp($data: RetractSignUpInput!) {
              retractSignUp(data: $data) {
                signUp {
                  id
                  event {
                    id
                  }
                  user {
                    id
                  }
                  participationStatus
                }
              }
            }
          `),
          variables: {
            data: {
              eventId: faker.string.uuid(),
            },
          },
        },
        {
          contextValue,
        },
      );

      /**
       * Assert
       *
       * Ensure that retract sign up was attempted with the correct arguments,
       * and that no errors were returned.
       */
      expect(errors).toBeUndefined();
      expect(data?.retractSignUp.signUp).toEqual({
        id: expect.any(String),
        event: {
          id: expect.any(String),
        },
        user: {
          id: expect.any(String),
        },
        participationStatus: "RETRACTED",
      });
      expect(eventService.retractSignUp).toHaveBeenCalledWith(contextValue.req.session.userId, expect.any(String));
    });

    it("should err if not logged in", async () => {
      /**
       * Arrange
       *
       * Create an unauthenticated context,
       */
      const { client, createMockContext, eventService } = createMockApolloServer();

      const contextValue = createMockContext({
        authenticated: false,
      });

      /**
       * Act
       *
       * Attempt to retract a sign up for an event
       */
      const { errors } = await client.mutate(
        {
          mutation: graphql(`
            mutation retractSignUp($data: RetractSignUpInput!) {
              retractSignUp(data: $data) {
                signUp {
                  id
                  event {
                    id
                  }
                  user {
                    id
                  }
                  participationStatus
                }
              }
            }
          `),
          variables: {
            data: {
              eventId: faker.string.uuid(),
            },
          },
        },
        {
          contextValue,
        },
      );

      /**
       * Assert
       *
       * Ensure that retract sign up was not attempted and that a permission denied error was returned.
       */
      expect(errors).toBeDefined();
      expect(errors?.every((error) => error.extensions?.code === errorCodes.ERR_PERMISSION_DENIED)).toBe(true);
      expect(eventService.retractSignUp).not.toHaveBeenCalled();
    });
  });
});

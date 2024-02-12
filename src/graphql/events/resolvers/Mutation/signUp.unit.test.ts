import { faker } from "@faker-js/faker";
import { type EventSignUp, ParticipationStatus } from "@prisma/client";
import { mock } from "jest-mock-extended";
import { errorCodes } from "~/domain/errors.js";
import type { EventType } from "~/domain/events/event.js";
import type { User } from "~/domain/users.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Event mutations", () => {
	describe("signUp", () => {
		it("should sign the user up for an event", async () => {
			/**
			 * Arrange
			 *
			 * Create an authenticated context,
			 * and set up the mock return value for the eventService.signUp method,
			 * and mock return values for eventSerivce.get and userService.get to test the resolvers.
			 */
			const { client, createMockContext, eventService, userService } =
				createMockApolloServer();

			const contextValue = createMockContext({
				authenticated: true,
				userId: faker.string.uuid(),
			});

			eventService.signUp.mockResolvedValue(
				mock<EventSignUp>({
					id: faker.string.uuid(),
					participationStatus: ParticipationStatus.CONFIRMED,
				}),
			);
			eventService.get.mockResolvedValue(
				mock<EventType>({ id: faker.string.uuid() }),
			);
			userService.get.mockResolvedValue(
				mock<User>({ id: faker.string.uuid() }),
			);

			/**
			 * Act
			 *
			 * Sign up for an event using the authenticated context
			 */
			const { errors, data } = await client.mutate(
				{
					mutation: graphql(`
            mutation signUp($data: SignUpInput!) {
              signUp(data: $data) {
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
			 * Ensure that the sign up was attempted with the correct arguments,
			 * and that no errors were returned.
			 */
			expect(errors).toBeUndefined();
			expect(data?.signUp.signUp).toEqual({
				id: expect.any(String),
				event: {
					id: expect.any(String),
				},
				user: {
					id: expect.any(String),
				},
				participationStatus: "CONFIRMED",
			});
			expect(eventService.signUp).toHaveBeenCalledWith(
				expect.objectContaining({ user: contextValue.user }),
				contextValue.user?.id,
				expect.any(String),
			);
		});

		it("should err if not logged in", async () => {
			/**
			 * Arrange
			 *
			 * Create an unauthenticated context,
			 */
			const { client, createMockContext, eventService } =
				createMockApolloServer();

			const contextValue = createMockContext({
				authenticated: false,
			});

			/**
			 * Act
			 *
			 * Attempt to sign up for an event
			 */
			const { errors } = await client.mutate(
				{
					mutation: graphql(`
            mutation signUp($data: SignUpInput!) {
              signUp(data: $data) {
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
			 * Ensure that the sign up was not performed and that a permission denied error was returned.
			 */
			expect(errors).toBeDefined();
			expect(
				errors?.every(
					(error) =>
						error.extensions?.code === errorCodes.ERR_PERMISSION_DENIED,
				),
			).toBe(true);
			expect(eventService.signUp).not.toHaveBeenCalled();
		});
	});
});

import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import type { EventType } from "~/domain/events/event.js";
import {
	EventParticipationStatus,
	type EventSignUp,
} from "~/domain/events/index.js";
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
				user: { id: faker.string.uuid() },
			});

			eventService.signUp.mockResolvedValue({
				ok: true,
				data: {
					signUp: mock<EventSignUp>({
						id: faker.string.uuid(),
						participationStatus: EventParticipationStatus.CONFIRMED,
					}),
				},
			});
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
							userProvidedInformation: faker.lorem.paragraph(),
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
				{
					userId: contextValue.user?.id,
					eventId: expect.any(String),
					userProvidedInformation: expect.any(String),
				},
			);
		});
	});
});

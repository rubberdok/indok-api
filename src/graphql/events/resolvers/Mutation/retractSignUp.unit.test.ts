import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import { InvalidArgumentError } from "~/domain/errors.js";
import type { EventType } from "~/domain/events/event.js";
import {
	EventParticipationStatus,
	type EventSignUp,
} from "~/domain/events/index.js";
import type { User } from "~/domain/users.js";
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
			const { client, createMockContext, eventService, userService } =
				createMockApolloServer();

			const contextValue = createMockContext({
				user: {
					id: faker.string.uuid(),
				},
			});

			eventService.retractSignUp.mockResolvedValue({
				ok: true,
				data: {
					signUp: mock<EventSignUp>({
						id: faker.string.uuid(),
						participationStatus: EventParticipationStatus.RETRACTED,
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
			expect(eventService.retractSignUp).toHaveBeenCalledWith(
				expect.anything(),
				{
					eventId: expect.any(String),
				},
			);
		});

		it("throws if retract fails", async () => {
			/**
			 * Arrange
			 *
			 * Create an authenticated context,
			 * and set up the mock return value for the eventService.retractSignUp method,
			 * and mock return values for eventSerivce.get and userService.get to test the resolvers.
			 */
			const { client, createMockContext, eventService, userService } =
				createMockApolloServer();

			const contextValue = createMockContext({
				user: {
					id: faker.string.uuid(),
				},
			});

			eventService.retractSignUp.mockResolvedValue({
				ok: false,
				error: new InvalidArgumentError(""),
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
			 * Retract the sign up for an event using the authenticated context
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
			 */
			expect(errors).toBeDefined();
		});
	});
});

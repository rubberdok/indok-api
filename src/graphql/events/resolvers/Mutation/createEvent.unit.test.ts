import { ApolloServerErrorCode } from "@apollo/server/errors";
import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import type { EventTypeFromDSO } from "~/domain/events.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Event mutations", () => {
	describe("createEvent", () => {
		it("should create an event without sign up details", async () => {
			/**
			 * Arrange
			 *
			 * Create an authenticated context,
			 * and set up the mock return value for the eventService.create method.
			 */
			const { client, createMockContext, eventService } =
				createMockApolloServer();

			const contextValue = createMockContext({
				user: {
					id: faker.string.uuid(),
				},
			});

			eventService.create.mockResolvedValue({
				ok: true,
				data: {
					event: mock<EventTypeFromDSO>({
						id: faker.string.uuid(),
						name: faker.person.fullName(),
						description: faker.lorem.paragraph(),
					}),
				},
			});

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
							event: {
								type: "BASIC",
								organizationId: faker.string.uuid(),
								name: faker.person.fullName(),
								startAt: faker.date.future(),
							},
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
			 * Ensure that the event creation was attempted with the correct arguments,
			 * and that no errors were returned.
			 */
			expect(errors).toBeUndefined();
			expect(eventService.create).toHaveBeenCalledWith(
				expect.objectContaining({
					user: expect.objectContaining({ id: expect.any(String) }),
				}),
				{
					type: "BASIC",
					data: {
						name: expect.any(String),
						organizationId: expect.any(String),
						startAt: expect.any(Date),
					},
				},
			);
		});

		it("should create an event with sign up details", async () => {
			/**
			 * Arrange
			 *
			 * Create an authenticated context,
			 * and set up the mock return value for the eventService.create method.
			 */
			const { client, createMockContext, eventService } =
				createMockApolloServer();

			const contextValue = createMockContext({
				user: {
					id: faker.string.uuid(),
				},
			});

			eventService.create.mockResolvedValue({
				ok: true,
				data: {
					event: mock<EventTypeFromDSO>({
						id: faker.string.uuid(),
						name: faker.person.fullName(),
						description: faker.lorem.paragraph(),
					}),
				},
			});
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
							event: {
								type: "SIGN_UPS",
								organizationId: faker.string.uuid(),
								name: faker.person.fullName(),
								startAt: faker.date.future(),
								signUpsEnabled: true,
								signUpDetails: {
									signUpsStartAt: faker.date.future(),
									signUpsEndAt: faker.date.future(),
									capacity: 1,
									slots: [{ capacity: 1 }],
								},
							},
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
			 * Ensure that the event creation was attempted with the correct arguments,
			 * and that no errors were returned.
			 */
			expect(errors).toBeUndefined();
			expect(eventService.create).toHaveBeenCalledWith(expect.any(Object), {
				type: "SIGN_UPS",
				data: expect.objectContaining({
					name: expect.any(String),
					startAt: expect.any(Date),
					signUpsEnabled: true,
					signUpDetails: {
						signUpsStartAt: expect.any(Date),
						signUpsEndAt: expect.any(Date),
						capacity: 1,
						slots: [{ capacity: 1 }],
					},
				}),
			});
		});

		it("should raise bad input error if the user does not supply the correct type with sign up details", async () => {
			/**
			 * Arrange
			 *
			 * Create an authenticated context,
			 * and set up the mock return value for the eventService.create method.
			 */
			const { client, createMockContext, eventService } =
				createMockApolloServer();

			const contextValue = createMockContext({
				user: {
					id: faker.string.uuid(),
				},
			});

			eventService.create.mockResolvedValue({
				ok: true,
				data: {
					event: mock<EventTypeFromDSO>({
						id: faker.string.uuid(),
						name: faker.person.fullName(),
						description: faker.lorem.paragraph(),
					}),
				},
			});
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
							event: {
								type: "SIGN_UPS",
								organizationId: faker.string.uuid(),
								name: faker.person.fullName(),
								startAt: faker.date.future(),
								signUpsEnabled: true,
							},
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
			 * Ensure that the event creation was attempted with the correct arguments,
			 * and that no errors were returned.
			 */
			expect(errors).toBeDefined();
			errors?.map((err) =>
				expect(err.extensions?.code).toBe(ApolloServerErrorCode.BAD_USER_INPUT),
			);
		});
	});
});

import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import { errorCodes } from "~/domain/errors.js";
import type { Event } from "~/domain/events.js";
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
				authenticated: true,
				userId: faker.string.uuid(),
			});

			eventService.create.mockResolvedValue(
				mock<Event>({
					id: faker.string.uuid(),
					name: faker.person.fullName(),
					description: faker.lorem.paragraph(),
				}),
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
							event: {
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
				expect.any(String),
				expect.any(String),
				{
					name: expect.any(String),
					startAt: expect.any(Date),
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
				authenticated: true,
				userId: faker.string.uuid(),
			});

			eventService.create.mockResolvedValue(
				mock<Event>({
					id: faker.string.uuid(),
					name: faker.person.fullName(),
					description: faker.lorem.paragraph(),
				}),
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
							event: {
								name: faker.person.fullName(),
								startAt: faker.date.future(),
							},
							signUpDetails: {
								enabled: true,
								signUpsStartAt: faker.date.future(),
								signUpsEndAt: faker.date.future(),
								capacity: 1,
								slots: [{ capacity: 1 }],
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
				expect.any(String),
				expect.any(String),
				{
					name: expect.any(String),
					startAt: expect.any(Date),
				},
				{
					signUpsEnabled: true,
					signUpsStartAt: expect.any(Date),
					signUpsEndAt: expect.any(Date),
					capacity: 1,
					slots: [{ capacity: 1 }],
				},
			);
		});

		it("should err if not logged in", async () => {
			const { client, createMockContext, eventService } =
				createMockApolloServer();

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
							event: {
								name: faker.person.fullName(),
								description: faker.lorem.paragraph(),
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
			 * Event creation was not attempted, and the mutation returned an error.
			 */
			expect(errors).toBeDefined();
			expect(
				errors?.every(
					(error) =>
						error.extensions?.code === errorCodes.ERR_PERMISSION_DENIED,
				),
			).toBe(true);
			expect(eventService.create).not.toHaveBeenCalled();
		});
	});
});

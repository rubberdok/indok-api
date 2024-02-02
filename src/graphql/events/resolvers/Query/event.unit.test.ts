import { faker } from "@faker-js/faker";
import type { Organization } from "@prisma/client";
import { mock } from "jest-mock-extended";
import type { EventTypeFromDSO } from "~/domain/events.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Event queries", () => {
	describe("event", () => {
		it("should return an event", async () => {
			const { client, eventService, organizationService } =
				createMockApolloServer();
			eventService.get.mockResolvedValue(
				mock<EventTypeFromDSO>({
					id: faker.string.uuid(),
					organizationId: faker.string.uuid(),
				}),
			);
			organizationService.get.mockResolvedValue(
				mock<Organization>({ id: faker.string.uuid() }),
			);

			const { errors } = await client.query({
				query: graphql(`
          query event($data: EventInput!) {
            event(data: $data) {
              event {
                id
                organization {
                  id
                }
              }
            }
          }
        `),
				variables: {
					data: { id: faker.string.uuid() },
				},
			});

			expect(errors).toBeUndefined();
			expect(eventService.get).toHaveBeenCalledWith(expect.any(String));
			expect(organizationService.get).toHaveBeenCalledWith(expect.any(String));
		});

		describe("canSignUp", () => {
			it("should return true if the user is authenticated and can sign up for the event", async () => {
				const { client, eventService, createMockContext } =
					createMockApolloServer();
				const eventId = faker.string.uuid();
				const userId = faker.string.uuid();
				eventService.get.mockResolvedValue(
					mock<EventTypeFromDSO>({ id: eventId }),
				);
				eventService.canSignUpForEvent.mockResolvedValue(true);

				const { errors, data } = await client.query(
					{
						query: graphql(`
              query CanSignUpEvent($data: EventInput!) {
                event(data: $data) {
                  event {
                    canSignUp
                  }
                }
              }
            `),
						variables: {
							data: { id: faker.string.uuid() },
						},
					},
					{
						contextValue: createMockContext({ userId, authenticated: true }),
					},
				);

				expect(errors).toBeUndefined();
				expect(eventService.canSignUpForEvent).toHaveBeenCalledWith(
					userId,
					eventId,
				);
				expect(data?.event.event.canSignUp).toBe(true);
			});

			it("should return false if the user is not authenticated", async () => {
				const { client, eventService } = createMockApolloServer();
				eventService.get.mockResolvedValue(
					mock<EventTypeFromDSO>({ id: faker.string.uuid() }),
				);

				const { errors, data } = await client.query({
					query: graphql(`
            query CanSignUpEvent($data: EventInput!) {
              event(data: $data) {
                event {
                  canSignUp
                }
              }
            }
          `),
					variables: {
						data: { id: faker.string.uuid() },
					},
				});

				expect(errors).toBeUndefined();
				expect(data?.event.event.canSignUp).toBe(false);
			});

			it("should return false if canSignUpForEvent returns false", async () => {
				const { client, eventService } = createMockApolloServer();
				eventService.get.mockResolvedValue(
					mock<EventTypeFromDSO>({ id: faker.string.uuid() }),
				);
				eventService.canSignUpForEvent.mockResolvedValue(false);

				const { errors, data } = await client.query({
					query: graphql(`
            query CanSignUpEvent($data: EventInput!) {
              event(data: $data) {
                event {
                  canSignUp
                }
              }
            }
          `),
					variables: {
						data: { id: faker.string.uuid() },
					},
				});

				expect(errors).toBeUndefined();
				expect(data?.event.event.canSignUp).toBe(false);
			});
		});
	});
});

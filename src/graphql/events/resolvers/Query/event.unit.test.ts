import { faker } from "@faker-js/faker";
import type { EventSignUp, Organization } from "@prisma/client";
import { mock } from "jest-mock-extended";
import { UnauthorizedError } from "~/domain/errors.js";
import type { EventType } from "~/domain/events/event.js";
import type { OrderType } from "~/domain/products.js";
import type { User } from "~/domain/users.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Event queries", () => {
	describe("event", () => {
		it("should return an event", async () => {
			const { client, eventService, organizationService } =
				createMockApolloServer();
			eventService.get.mockResolvedValue(
				mock<EventType>({
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
				eventService.get.mockResolvedValue(mock<EventType>({ id: eventId }));
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
						contextValue: createMockContext({ user: { id: userId } }),
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
					mock<EventType>({ id: faker.string.uuid() }),
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
					mock<EventType>({ id: faker.string.uuid() }),
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

		it("should return signUpDetails for sign up events", async () => {
			const { client, eventService, organizationService } =
				createMockApolloServer();

			const event: EventType = {
				id: faker.string.uuid(),
				organizationId: faker.string.uuid(),
				type: "SIGN_UPS",
				contactEmail: faker.internet.email(),
				capacity: 10,
				description: faker.lorem.paragraph(),
				endAt: new Date(),
				startAt: new Date(),
				location: faker.location.streetAddress(),
				name: faker.company.buzzNoun(),
				remainingCapacity: 10,
				signUpsEnabled: true,
				signUpsEndAt: new Date(),
				signUpsStartAt: new Date(),
				version: 1,
			};
			eventService.get.mockResolvedValue(event);
			organizationService.get.mockResolvedValue(
				mock<Organization>({ id: event.organizationId ?? faker.string.uuid() }),
			);
			eventService.getCategories.mockResolvedValue([
				{ id: faker.string.uuid(), name: faker.color.human() },
			]);

			const { errors, data } = await client.query({
				query: graphql(`
          query eventWithAllFields($data: EventInput!) {
            event(data: $data) {
              event {
                id
				signUpDetails {
					signUpsStartAt
					signUpsEndAt
					capacity
				}
                organization {
                  id
                }
				contactEmail
				endAt
				location
				signUpsEnabled
				startAt
				type
				categories {
					id
					name
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
			expect(data?.event.event).toEqual(
				expect.objectContaining({
					type: "SIGN_UPS",
					signUpDetails: {
						capacity: 10,
						signUpsEndAt: event.signUpsEndAt,
						signUpsStartAt: event.signUpsStartAt,
					},
				}),
			);
		});

		it("should return signUpDetails: null for basic events", async () => {
			const { client, eventService, organizationService } =
				createMockApolloServer();

			const event: EventType = {
				id: faker.string.uuid(),
				organizationId: faker.string.uuid(),
				type: "BASIC",
				contactEmail: faker.internet.email(),
				capacity: 10,
				description: faker.lorem.paragraph(),
				endAt: new Date(),
				startAt: new Date(),
				location: faker.location.streetAddress(),
				name: faker.company.buzzNoun(),
				remainingCapacity: 10,
				signUpsEnabled: true,
				signUpsEndAt: new Date(),
				signUpsStartAt: new Date(),
				version: 1,
			};
			eventService.get.mockResolvedValue(event);
			organizationService.get.mockResolvedValue(
				mock<Organization>({ id: event.organizationId ?? faker.string.uuid() }),
			);
			eventService.getCategories.mockResolvedValue([
				{ id: faker.string.uuid(), name: faker.color.human() },
			]);

			const { errors, data } = await client.query({
				query: graphql(`
          query eventWithAllFields($data: EventInput!) {
            event(data: $data) {
              event {
                id
				signUpDetails {
					signUpsStartAt
					signUpsEndAt
					capacity
				}
                organization {
                  id
                }
				contactEmail
				endAt
				location
				signUpsEnabled
				startAt
				type
				categories {
					id
					name
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
			expect(data?.event.event).toEqual(
				expect.objectContaining({
					type: "BASIC",
					signUpDetails: null,
				}),
			);
		});

		it("should return event user for an authenticated user", async () => {
			const { client, eventService, productService, createMockContext } =
				createMockApolloServer();
			const user = mock<User>({ id: faker.string.uuid() });
			const event = mock<EventType>({ id: faker.string.uuid() });
			eventService.get.mockResolvedValue(event);
			eventService.getOrderForSignUp.mockResolvedValue({
				ok: true,
				data: {
					order: mock<OrderType>({
						paymentStatus: "CAPTURED",
						id: faker.string.uuid(),
						userId: user.id,
					}),
				},
			});
			eventService.getSignUp.mockResolvedValue({
				ok: true,
				data: {
					signUp: mock<EventSignUp>({
						id: faker.string.uuid(),
						userId: user.id,
					}),
				},
			});
			productService.orders.get.mockResolvedValue({
				ok: true,
				data: {
					order: mock<OrderType>({
						paymentStatus: "CAPTURED",
						id: faker.string.uuid(),
						userId: user.id,
					}),
				},
			});

			const { data } = await client.query(
				{
					query: graphql(`
				query eventWithEventUserAndOrder($data: EventInput!) {
					event(data: $data) {
						event {
							user {
								id
								ticketStatus
								ticket {
									paymentStatus
									id
								}
								signUp {
									id
									order {
										id
									}
								}
							}
						}
					}
				}
			`),
					variables: {
						data: {
							id: faker.string.uuid(),
						},
					},
				},
				{
					contextValue: createMockContext({ user }),
				},
			);

			expect(data?.event.event.user).toEqual({
				id: user.id,
				ticketStatus: "BOUGHT",
				ticket: {
					paymentStatus: "CAPTURED",
					id: expect.any(String),
				},
				signUp: {
					id: expect.any(String),
					order: {
						id: expect.any(String),
					},
				},
			});
		});

		it("should return return null if an UnauthorizedError is returned", async () => {
			const { client, eventService, createMockContext } =
				createMockApolloServer();
			const user = mock<User>({ id: faker.string.uuid() });
			const event = mock<EventType>({ id: faker.string.uuid() });
			eventService.get.mockResolvedValue(event);
			eventService.getOrderForSignUp.mockResolvedValue({
				ok: false,
				error: new UnauthorizedError(""),
			});
			eventService.getSignUp.mockResolvedValue({
				ok: false,
				error: new UnauthorizedError(""),
			});

			const { data } = await client.query(
				{
					query: graphql(`
				query eventWithEventUser($data: EventInput!) {
					event(data: $data) {
						event {
							user {
								id
								ticketStatus
								ticket {
									paymentStatus
									id
								}
								signUp {
									id
								}
							}
						}
					}
				}
			`),
					variables: {
						data: {
							id: faker.string.uuid(),
						},
					},
				},
				{
					contextValue: createMockContext({ user }),
				},
			);

			expect(data?.event.event.user).toEqual({
				id: user.id,
				ticketStatus: null,
				ticket: null,
				signUp: null,
			});
		});

		it("should return return null not logged in", async () => {
			const { client, eventService } = createMockApolloServer();
			const event = mock<EventType>({ id: faker.string.uuid() });
			eventService.get.mockResolvedValue(event);
			eventService.getOrderForSignUp.mockResolvedValue({
				ok: false,
				error: new UnauthorizedError(""),
			});
			eventService.getSignUp.mockResolvedValue({
				ok: false,
				error: new UnauthorizedError(""),
			});

			const { data } = await client.query({
				query: graphql(`
				query eventWithEventUser($data: EventInput!) {
					event(data: $data) {
						event {
							user {
								id
								ticketStatus
								ticket {
									paymentStatus
									id
								}
								signUp {
									id
								}
							}
						}
					}
				}
			`),
				variables: {
					data: {
						id: faker.string.uuid(),
					},
				},
			});

			expect(data?.event.event.user).toEqual(null);
		});
	});
});

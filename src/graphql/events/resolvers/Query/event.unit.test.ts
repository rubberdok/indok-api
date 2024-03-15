import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import {
	InternalServerError,
	InvalidArgumentError,
	NotFoundError,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
import type { EventType } from "~/domain/events/event.js";
import type { EventSignUp } from "~/domain/events/sign-ups.js";
import type { Organization } from "~/domain/organizations.js";
import type { OrderType, ProductType } from "~/domain/products.js";
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
			organizationService.organizations.get.mockResolvedValue(
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
			expect(organizationService.organizations.get).toHaveBeenCalledWith(
				expect.any(String),
			);
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
					expect.anything(),
					{
						eventId,
					},
				);
				expect(data?.event.event.canSignUp).toBe(true);
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

			const event: EventType = mock<EventType>({
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
			});
			eventService.get.mockResolvedValue(event);
			organizationService.organizations.get.mockResolvedValue(
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
			expect(organizationService.organizations.get).toHaveBeenCalledWith(
				expect.any(String),
			);
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

			const event: EventType = mock<EventType>({
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
			});
			eventService.get.mockResolvedValue(event);
			organizationService.organizations.get.mockResolvedValue(
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
			expect(organizationService.organizations.get).toHaveBeenCalledWith(
				expect.any(String),
			);
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

		it("signUp { order { id } } should return null if unauthorized", async () => {
			const { client, eventService, createMockContext } =
				createMockApolloServer();
			const event = mock<EventType>({ id: faker.string.uuid() });
			const user = mock<User>({ id: faker.string.uuid() });
			eventService.get.mockResolvedValue(event);
			eventService.getOrderForSignUp.mockResolvedValue({
				ok: false,
				error: new UnauthorizedError(""),
			});
			eventService.getSignUp.mockResolvedValue({
				ok: true,
				data: {
					signUp: mock<EventSignUp>({
						id: faker.string.uuid(),
						orderId: faker.string.uuid(),
					}),
				},
			});

			const { data } = await client.query(
				{
					query: graphql(`
				query eventUserSignUp($data: EventInput!) {
					event(data: $data) {
						event {
							user {
								signUp {
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

			expect(data?.event.event.user?.signUp?.order).toEqual(null);
		});

		it("ticket event should resolve product on a TICKETS event", async () => {
			const { client, eventService, productService, createMockContext } =
				createMockApolloServer();
			const event = mock<EventType>({
				id: faker.string.uuid(),
				productId: faker.string.uuid(),
				type: "TICKETS",
			});
			const user = mock<User>({
				id: faker.string.uuid(),
			});
			eventService.get.mockResolvedValue(event);
			productService.products.get.mockResolvedValue({
				ok: true,
				data: {
					product: mock<ProductType>({
						id: faker.string.uuid(),
					}),
				},
			});

			const { data } = await client.query(
				{
					query: graphql(`
				query ticketEventWithProduct($data: EventInput!) {
					event(data: $data) {
						event {
							ticketInformation {
								product {
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

			expect(data?.event.event.ticketInformation?.product).toEqual({
				id: expect.any(String),
			});
		});

		it("event { ticketInformation { product { id } } } should be null if product is NotFound", async () => {
			const { client, eventService, productService, createMockContext } =
				createMockApolloServer();
			const event = mock<EventType>({
				id: faker.string.uuid(),
				productId: faker.string.uuid(),
				type: "TICKETS",
			});
			const user = mock<User>({
				id: faker.string.uuid(),
			});
			eventService.get.mockResolvedValue(event);
			productService.products.get.mockResolvedValue({
				ok: false,
				error: new NotFoundError(""),
			});

			const { data } = await client.query(
				{
					query: graphql(`
				query ticketEventWithProduct($data: EventInput!) {
					event(data: $data) {
						event {
							ticketInformation {
								product {
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

			expect(data?.event.event.ticketInformation?.product).toBeNull();
		});

		it("ticket information should be null for a non-ticket event", async () => {
			const { client, eventService, productService, createMockContext } =
				createMockApolloServer();
			const event = mock<EventType>({
				id: faker.string.uuid(),
				productId: faker.string.uuid(),
				type: "SIGN_UPS",
			});
			const user = mock<User>({
				id: faker.string.uuid(),
			});
			eventService.get.mockResolvedValue(event);
			productService.products.get.mockResolvedValue({
				ok: true,
				data: {
					product: mock<ProductType>({
						id: faker.string.uuid(),
					}),
				},
			});

			const { data } = await client.query(
				{
					query: graphql(`
				query ticketEventWithProduct($data: EventInput!) {
					event(data: $data) {
						event {
							ticketInformation {
								product {
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

			expect(data?.event.event.ticketInformation).toBeNull();
		});

		it("event { signUps { { confirmed } } } should resolve sign ups", async () => {
			const { client, eventService } = createMockApolloServer();
			const user = mock<User>({ id: faker.string.uuid() });
			eventService.get.mockResolvedValue(
				mock<EventType>({
					id: faker.string.uuid(),
					organizationId: faker.string.uuid(),
				}),
			);
			eventService.findManySignUps.mockResolvedValue({
				ok: true,
				data: {
					signUps: [
						mock<EventSignUp>({
							id: faker.string.uuid(),
							userId: user.id,
						}),
					],
					total: 1,
				},
			});

			const { data, errors } = await client.query({
				query: graphql(`
				query eventWithSignUps($data: EventInput!) {
					event(data: $data) {
						event {
							signUps {
								confirmed {
									signUps {
										id
									}
									total
								}
								waitList {
									total
								}
								retracted {
									total
								}
							}
						}
					}
				}
			`),
				variables: { data: { id: faker.string.uuid() } },
			});

			expect(errors).toBeUndefined();
			expect(data?.event.event.signUps).toBeDefined();
			expect(data?.event.event.signUps).toEqual(
				expect.objectContaining({
					confirmed: expect.objectContaining({
						signUps: expect.any(Array),
						total: expect.any(Number),
					}),
					waitList: expect.objectContaining({
						total: expect.any(Number),
					}),
					retracted: expect.objectContaining({
						total: expect.any(Number),
					}),
				}),
			);
		});

		it("event { signUps { { confirmed } } } should return [] and 0 for PermissionDeniedError", async () => {
			const { client, eventService } = createMockApolloServer();
			eventService.get.mockResolvedValue(
				mock<EventType>({
					id: faker.string.uuid(),
					organizationId: faker.string.uuid(),
				}),
			);
			eventService.findManySignUps.mockResolvedValue({
				ok: false,
				error: new PermissionDeniedError(""),
			});

			const { data, errors } = await client.query({
				query: graphql(`
				query eventWithSignUps($data: EventInput!) {
					event(data: $data) {
						event {
							signUps {
								confirmed {
									signUps {
										id
									}
									total
								}
								waitList {
									total
								}
								retracted {
									total
								}
							}
						}
					}
				}
			`),
				variables: { data: { id: faker.string.uuid() } },
			});

			expect(errors).toBeUndefined();
			expect(data?.event.event.signUps).toEqual({
				confirmed: {
					signUps: [],
					total: 0,
				},
				waitList: {
					total: 0,
				},
				retracted: {
					total: 0,
				},
			});
		});

		it("event { signUps { { confirmed } } } should result in error for InternalServerError", async () => {
			const { client, eventService } = createMockApolloServer();
			eventService.get.mockResolvedValue(
				mock<EventType>({
					id: faker.string.uuid(),
					organizationId: faker.string.uuid(),
				}),
			);
			eventService.findManySignUps.mockResolvedValue({
				ok: false,
				error: new InternalServerError(""),
			});

			const { errors } = await client.query({
				query: graphql(`
				query eventWithSignUps($data: EventInput!) {
					event(data: $data) {
						event {
							signUps {
								confirmed {
									signUps {
										id
									}
									total
								}
								waitList {
									total
								}
								retracted {
									total
								}
							}
						}
					}
				}
			`),
				variables: { data: { id: faker.string.uuid() } },
			});

			expect(errors).toBeDefined();
		});

		it("event { user { signUp { approximatePositionOnWaitList } } } should resolve", async () => {
			const { client, eventService, createMockContext } =
				createMockApolloServer();
			eventService.get.mockResolvedValue(
				mock<EventType>({
					id: faker.string.uuid(),
					organizationId: faker.string.uuid(),
				}),
			);
			eventService.getApproximatePositionOnWaitingList.mockResolvedValue({
				ok: true,
				data: {
					position: 1,
				},
			});
			eventService.getSignUp.mockResolvedValue({
				ok: true,
				data: {
					signUp: mock<EventSignUp>({
						id: faker.string.uuid(),
						userId: faker.string.uuid(),
					}),
				},
			});

			const { data, errors } = await client.query(
				{
					query: graphql(`
				query eventWithWaitListPosition($data: EventInput!) {
					event(data: $data) {
						event {
							id
							user {
								signUp {
									approximatePositionOnWaitList
								}
							}
						}
					}
				}
			`),
					variables: { data: { id: faker.string.uuid() } },
				},
				{
					contextValue: createMockContext({
						user: { id: faker.string.uuid() },
					}),
				},
			);

			expect(errors).toBeUndefined();
			expect(
				data?.event.event.user?.signUp?.approximatePositionOnWaitList,
			).toBe(1);
		});

		it("event { user { signUp { approximatePositionOnWaitList } } } should return null expect for internal server error", async () => {
			const { client, eventService, createMockContext } =
				createMockApolloServer();
			eventService.get.mockResolvedValue(
				mock<EventType>({
					id: faker.string.uuid(),
					organizationId: faker.string.uuid(),
				}),
			);
			eventService.getApproximatePositionOnWaitingList.mockResolvedValue({
				ok: false,
				error: new InvalidArgumentError(""),
			});
			eventService.getSignUp.mockResolvedValue({
				ok: true,
				data: {
					signUp: mock<EventSignUp>({
						id: faker.string.uuid(),
						userId: faker.string.uuid(),
					}),
				},
			});

			const { data } = await client.query(
				{
					query: graphql(`
				query eventWithWaitListPosition($data: EventInput!) {
					event(data: $data) {
						event {
							id
							user {
								signUp {
									approximatePositionOnWaitList
								}
							}
						}
					}
				}
			`),
					variables: { data: { id: faker.string.uuid() } },
				},
				{
					contextValue: createMockContext({
						user: { id: faker.string.uuid() },
					}),
				},
			);

			expect(
				data?.event.event.user?.signUp?.approximatePositionOnWaitList,
			).toBe(null);
		});

		it("event { user { signUp { approximatePositionOnWaitList } } } should return error for internal server error", async () => {
			const { client, eventService, createMockContext } =
				createMockApolloServer();
			eventService.get.mockResolvedValue(
				mock<EventType>({
					id: faker.string.uuid(),
					organizationId: faker.string.uuid(),
				}),
			);
			eventService.getApproximatePositionOnWaitingList.mockResolvedValue({
				ok: false,
				error: new InternalServerError(""),
			});
			eventService.getSignUp.mockResolvedValue({
				ok: true,
				data: {
					signUp: mock<EventSignUp>({
						id: faker.string.uuid(),
						userId: faker.string.uuid(),
					}),
				},
			});

			const { errors } = await client.query(
				{
					query: graphql(`
				query eventWithWaitListPosition($data: EventInput!) {
					event(data: $data) {
						event {
							id
							user {
								signUp {
									approximatePositionOnWaitList
								}
							}
						}
					}
				}
			`),
					variables: { data: { id: faker.string.uuid() } },
				},
				{
					contextValue: createMockContext({
						user: { id: faker.string.uuid() },
					}),
				},
			);

			expect(errors).toBeDefined();
		});
		describe("event { signUp { id } }", () => {
			it("should resolve the sign up for the logged-in user", async () => {
				const { client, createMockContext, eventService } =
					createMockApolloServer();
				const user = mock<User>({ id: faker.string.uuid() });
				const event = mock<EventType>({ id: faker.string.uuid() });
				const signUp = mock<EventSignUp>({
					id: faker.string.uuid(),
					userId: user.id,
				});
				eventService.get.mockResolvedValue(event);
				eventService.getSignUp.mockResolvedValue({
					ok: true,
					data: { signUp },
				});

				const { data } = await client.query(
					{
						query: graphql(`
						query eventWithSignUp($data: EventInput!) {
							event(data: $data) {
								event {
									signUp {
										id
									}
								}
							}
						}
					`),
						variables: {
							data: {
								id: event.id,
							},
						},
					},
					{
						contextValue: createMockContext({ user }),
					},
				);

				expect(data?.event.event.signUp).toEqual({
					id: signUp.id,
				});
				expect(eventService.getSignUp).toHaveBeenCalledWith(
					expect.objectContaining({
						user: expect.objectContaining({ id: user.id }),
					}),
					expect.anything(),
				);
			});

			it("should return null on UnauthorizedError", async () => {
				const { client, createMockContext, eventService } =
					createMockApolloServer();
				const user = mock<User>({ id: faker.string.uuid() });
				const event = mock<EventType>({ id: faker.string.uuid() });
				eventService.get.mockResolvedValue(event);
				eventService.getSignUp.mockResolvedValue({
					ok: false,
					error: new UnauthorizedError(""),
				});

				const { data } = await client.query(
					{
						query: graphql(`
						query eventWithSignUp($data: EventInput!) {
							event(data: $data) {
								event {
									signUp {
										id
									}
								}
							}
						}
					`),
						variables: {
							data: {
								id: event.id,
							},
						},
					},
					{
						contextValue: createMockContext({ user }),
					},
				);

				expect(data?.event.event.signUp).toEqual(null);
			});

			it("should return null on NotFoundError", async () => {
				const { client, createMockContext, eventService } =
					createMockApolloServer();
				const user = mock<User>({ id: faker.string.uuid() });
				const event = mock<EventType>({ id: faker.string.uuid() });
				eventService.get.mockResolvedValue(event);
				eventService.getSignUp.mockResolvedValue({
					ok: false,
					error: new NotFoundError(""),
				});

				const { data } = await client.query(
					{
						query: graphql(`
						query eventWithSignUp($data: EventInput!) {
							event(data: $data) {
								event {
									signUp {
										id
									}
								}
							}
						}
					`),
						variables: {
							data: {
								id: event.id,
							},
						},
					},
					{
						contextValue: createMockContext({ user }),
					},
				);

				expect(data?.event.event.signUp).toEqual(null);
			});

			it("should return error in InternalServerError", async () => {
				const { client, createMockContext, eventService } =
					createMockApolloServer();
				const user = mock<User>({ id: faker.string.uuid() });
				const event = mock<EventType>({ id: faker.string.uuid() });
				eventService.get.mockResolvedValue(event);
				eventService.getSignUp.mockResolvedValue({
					ok: false,
					error: new InternalServerError(""),
				});

				const { data, errors } = await client.query(
					{
						query: graphql(`
						query eventWithSignUp($data: EventInput!) {
							event(data: $data) {
								event {
									signUp {
										id
									}
								}
							}
						}
					`),
						variables: {
							data: {
								id: event.id,
							},
						},
					},
					{
						contextValue: createMockContext({ user }),
					},
				);

				expect(data?.event.event.signUp).toEqual(null);
				expect(errors).toBeDefined();
			});
		});
	});
});

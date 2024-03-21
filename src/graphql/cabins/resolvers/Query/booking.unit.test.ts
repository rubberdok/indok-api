import { faker } from "@faker-js/faker";
import { Booking } from "~/domain/cabins.js";
import { InternalServerError, NotFoundError } from "~/domain/errors.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";
import { Result } from "~/lib/result.js";

describe("Cabin queries", () => {
	describe("booking", () => {
		it("returns a booking", async () => {
			const { client, cabinService } = createMockApolloServer();
			const booking = new Booking({
				cabins: [],
				createdAt: faker.date.recent(),
				email: faker.internet.email(),
				endDate: faker.date.recent(),
				externalParticipantsCount: faker.number.int({ max: 10 }),
				feedback: faker.lorem.paragraph(),
				firstName: faker.person.firstName(),
				id: faker.string.uuid(),
				internalParticipantsCount: faker.number.int({ max: 10 }),
				lastName: faker.person.lastName(),
				phoneNumber: faker.phone.number(),
				questions: faker.lorem.paragraph(),
				startDate: faker.date.recent(),
				status: "PENDING",
				totalCost: faker.number.int({ max: 200 }),
			});
			cabinService.getBooking.mockResolvedValue(
				Result.success({
					booking,
				}),
			);

			const { data } = await client.query({
				query: graphql(`
                    query Booking($data: BookingInput!) {
                        booking(data: $data) {
                            booking {
                                id
                                guests {
                                    internal
                                    external
                                }
                            }
                        }
                    }
                `),
				variables: {
					data: {
						id: faker.string.uuid(),
						email: faker.internet.email(),
					},
				},
			});

			expect(data).toEqual({
				booking: {
					booking: {
						id: booking.id,
						guests: {
							internal: booking.internalParticipantsCount,
							external: booking.externalParticipantsCount,
						},
					},
				},
			});
		});

		it("returns null on NotFoundError", async () => {
			const { client, cabinService } = createMockApolloServer();
			cabinService.getBooking.mockResolvedValue(
				Result.error(new NotFoundError("")),
			);

			const { data } = await client.query({
				query: graphql(`
                    query Booking($data: BookingInput!) {
                        booking(data: $data) {
                            booking {
                                id
                                guests {
                                    internal
                                    external
                                }
                            }
                        }
                    }
                `),
				variables: {
					data: {
						id: faker.string.uuid(),
						email: faker.internet.email(),
					},
				},
			});

			expect(data).toEqual({
				booking: {
					booking: null,
				},
			});
		});

		it("throws on InternalServerError", async () => {
			const { client, cabinService } = createMockApolloServer();
			cabinService.getBooking.mockResolvedValue(
				Result.error(new InternalServerError("")),
			);

			const { errors } = await client.query({
				query: graphql(`
                    query Booking($data: BookingInput!) {
                        booking(data: $data) {
                            booking {
                                id
                                guests {
                                    internal
                                    external
                                }
                            }
                        }
                    }
                `),
				variables: {
					data: {
						id: faker.string.uuid(),
						email: faker.internet.email(),
					},
				},
			});

			expect(errors).toBeDefined();
		});
	});
});

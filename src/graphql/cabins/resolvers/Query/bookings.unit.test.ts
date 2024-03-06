import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import type { BookingType } from "~/domain/cabins.js";
import { InternalServerError, UnauthorizedError } from "~/domain/errors.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Cabin Queries", () => {
	describe("findManyBookings", () => {
		it("returns bookings and total count", async () => {
			const { client, cabinService } = createMockApolloServer();
			const bookings = [
				mock<BookingType>({ id: faker.string.uuid() }),
				mock<BookingType>({ id: faker.string.uuid() }),
				mock<BookingType>({ id: faker.string.uuid() }),
			];
			const totalCount = 3;
			cabinService.findManyBookings.mockResolvedValue({
				ok: true,
				data: {
					bookings,
					total: totalCount,
				},
			});
			const { errors, data } = await client.query({
				query: graphql(`
          query Bookings {
            bookings {
              bookings {
                id
              }
              total
            }
          }
        `),
			});
			expect(errors).toBeUndefined();
			expect(cabinService.findManyBookings).toHaveBeenCalled();
			expect(data).toEqual({
				bookings: expect.objectContaining({
					bookings: bookings.map((booking) => ({ id: booking.id })),
					total: totalCount,
				}),
			});
		});

		it("returns bookings [] and total count 0 if unauthorized", async () => {
			const { client, cabinService } = createMockApolloServer();
			cabinService.findManyBookings.mockResolvedValue({
				ok: false,
				error: new UnauthorizedError(""),
			});
			const { errors, data } = await client.query({
				query: graphql(`
          query Bookings {
            bookings {
              bookings {
                id
              }
              total
            }
          }
        `),
			});
			expect(errors).toBeUndefined();
			expect(cabinService.findManyBookings).toHaveBeenCalled();
			expect(data).toEqual({
				bookings: expect.objectContaining({
					bookings: [],
					total: 0,
				}),
			});
		});

		it("fails if internal server error", async () => {
			const { client, cabinService } = createMockApolloServer();
			cabinService.findManyBookings.mockResolvedValue({
				ok: false,
				error: new InternalServerError(""),
			});
			const { errors } = await client.query({
				query: graphql(`
          query Bookings {
            bookings {
              bookings {
                id
              }
              total
            }
          }
        `),
			});
			expect(errors).toBeDefined();
		});
	});
});

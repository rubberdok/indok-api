import { faker } from "@faker-js/faker";
import { DateTime } from "luxon";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("query { getAvailabilityCalendar }", () => {
	it("returns the availability calendar", async () => {
		const { client, cabinService } = createMockApolloServer();

		cabinService.getAvailabilityCalendar.mockResolvedValueOnce({
			ok: true,
			data: {
				calendarMonths: [
					{
						days: [
							{
								available: true,
								bookable: true,
								calendarDate: DateTime.fromObject({
									year: 2024,
									month: 1,
									day: 1,
								}),
								price: 100,
								availableForCheckIn: true,
								availableForCheckOut: true,
							},
						],
						month: 1,
						year: 2024,
					},
				],
			},
		});

		const { data, errors } = await client.query({
			query: graphql(`
                query GetAvailabilityCalendar($data: GetAvailabilityCalendarInput!) {
                    getAvailabilityCalendar(data: $data) {
                        calendarMonths {
                            month 
                            year
                            days {
                                calendarDate
                                available
                                bookable
                                price
                                availableForCheckIn
                                availableForCheckOut
                            }
                        }
                    }
                }
            `),
			variables: {
				data: {
					cabins: [{ id: faker.string.uuid() }],
					count: 1,
					month: 1,
					year: 2024,
				},
			},
		});

		expect(errors).toBeUndefined();
		expect(data).toEqual({
			getAvailabilityCalendar: {
				calendarMonths: [
					{
						days: [
							{
								available: true,
								bookable: true,
								calendarDate: DateTime.fromObject({
									year: 2024,
									month: 1,
									day: 1,
								}).toJSDate(),
								price: 100,
								availableForCheckIn: true,
								availableForCheckOut: true,
							},
						],
						month: 1,
						year: 2024,
					},
				],
			},
		});
	});
});

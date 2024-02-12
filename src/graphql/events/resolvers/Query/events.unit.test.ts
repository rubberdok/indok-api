import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import { DateTime } from "luxon";
import type { EventType } from "~/domain/events/event.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Event queries", () => {
	describe("events", () => {
		it("should return a list of events", async () => {
			const { client, eventService } = createMockApolloServer();
			eventService.findMany.mockResolvedValue([
				mock<EventType>({ id: faker.string.uuid() }),
			]);

			const { errors, data } = await client.query({
				query: graphql(`
          query events {
            events {
              events {
                id
              }
              total
            }
          }
        `),
			});
			expect(errors).toBeUndefined();
			expect(eventService.findMany).toHaveBeenCalled();
			expect(data?.events.total).toBe(1);
		});

		it("should filter on only future events with { futureEventsOnly: true }", async () => {
			const { client, eventService } = createMockApolloServer();
			eventService.findMany.mockResolvedValue([
				mock<EventType>({ id: faker.string.uuid() }),
			]);

			const { errors } = await client.query({
				query: graphql(`
          query futureEvents($data: EventsInput!) {
            events(data: $data) {
              events {
                id
              }
              total
            }
          }
        `),
				variables: {
					data: {
						futureEventsOnly: true,
					},
				},
			});
			expect(errors).toBeUndefined();
			expect(eventService.findMany).toHaveBeenCalledWith({
				onlyFutureEvents: true,
			});
		});

		it("should split events into this week, next week, and two weeks ahead or more", async () => {
			const { client, eventService } = createMockApolloServer();
			const eventThisWeek = {
				...mock<EventType>(),
				id: faker.string.uuid(),
				startAt: DateTime.now().toJSDate(),
			};
			const eventNextWeek = {
				...mock<EventType>(),
				id: faker.string.uuid(),
				startAt: DateTime.now().plus({ week: 1 }).toJSDate(),
			};
			const eventInTwoWeeks = {
				...mock<EventType>(),
				id: faker.string.uuid(),
				startAt: DateTime.now().plus({ week: 2 }).toJSDate(),
			};
			const eventFarInTheFuture = {
				...mock<EventType>(),
				id: faker.string.uuid(),
				startAt: DateTime.now().plus({ week: 5 }).toJSDate(),
			};
			/**
			 * These are included to verify that we don't just compare the week number,
			 * as events one year in the future will have the same week number as events
			 * this week.
			 */
			const eventOneYearInTheFuture = {
				...mock<EventType>(),
				id: faker.string.uuid(),
				startAt: DateTime.now().plus({ year: 1 }).toJSDate(),
			};
			const eventOneYearAndOneWeekInTheFuture = {
				...mock<EventType>(),
				id: faker.string.uuid(),
				startAt: DateTime.now().plus({ year: 1, week: 1 }).toJSDate(),
			};
			eventService.findMany.mockResolvedValue([
				eventThisWeek,
				eventNextWeek,
				eventInTwoWeeks,
				eventFarInTheFuture,
				eventOneYearInTheFuture,
				eventOneYearAndOneWeekInTheFuture,
			]);

			const { errors, data } = await client.query({
				query: graphql(`
          query weekEvents {
            events {
              thisWeek {
                id
              }
              nextWeek {
                id
              }
              twoWeeksOrLater {
                id
              }
              total
            }
          }
        `),
			});

			expect(errors).toBeUndefined();
			expect(data).toBeDefined();
			expect(eventService.findMany).toHaveBeenCalled();
			expect(data?.events.thisWeek).toHaveLength(1);
			expect(data?.events.thisWeek[0]?.id).toEqual(eventThisWeek.id);

			expect(data?.events.nextWeek).toHaveLength(1);
			expect(data?.events.nextWeek[0]?.id).toEqual(eventNextWeek.id);

			expect(data?.events.twoWeeksOrLater).toHaveLength(4);
			expect(data?.events.twoWeeksOrLater.map((event) => event.id)).toContain(
				eventInTwoWeeks.id,
			);
			expect(data?.events.twoWeeksOrLater.map((event) => event.id)).toContain(
				eventFarInTheFuture.id,
			);
		});
	});
});

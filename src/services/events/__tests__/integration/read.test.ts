import assert from "node:assert";
import { faker } from "@faker-js/faker";
import { range } from "lodash-es";
import { DateTime, Settings } from "luxon";
import { makeTestServices } from "~/__tests__/dependencies-factory.js";
import { NotFoundError } from "~/domain/errors.js";
import { makeMockContext } from "~/lib/context.js";
import type { Services } from "~/lib/server.js";
import { makeUserWithOrganizationMembership } from "./dependencies-factory.js";

let events: Services["events"];

describe("EventService", () => {
	beforeAll(() => {
		({ events } = makeTestServices());
	});

	describe("get", () => {
		it("should return an event", async () => {
			const { user, organization } = await makeUserWithOrganizationMembership();
			/**
			 * Arrange
			 *
			 * 1. Create an event
			 */
			const ctx = makeMockContext(user);
			const createEventResult = await events.create(ctx, {
				type: "BASIC",
				event: {
					organizationId: organization.id,
					name: faker.person.firstName(),
					startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					endAt: DateTime.now().plus({ days: 2 }).toJSDate(),
				},
			});
			if (!createEventResult.ok) throw createEventResult.error;

			/**
			 * Act
			 *
			 * 1. Get the event
			 */
			const event = await events.get(createEventResult.data.event.id);

			/**
			 * Assert
			 *
			 * 1. The event should be returned
			 */
			expect(event.id).toEqual(createEventResult.data.event.id);
		});

		it("should raise NotFoundError if the event does not exist", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create an event
			 */
			const { user, organization } = await makeUserWithOrganizationMembership();
			const ctx = makeMockContext(user);
			await events.create(ctx, {
				type: "BASIC",
				event: {
					organizationId: organization.id,
					name: faker.person.firstName(),
					startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					endAt: DateTime.now().plus({ days: 2 }).toJSDate(),
				},
			});

			/**
			 * Act
			 *
			 * 1. Get the event
			 */
			const event = events.get(faker.string.uuid());

			/**
			 * Assert
			 *
			 * 1. Not found error should be raised
			 */
			await expect(event).rejects.toThrow(NotFoundError);
		});
	});

	describe("findMany", () => {
		const defaultNow = Settings.now;
		afterAll(() => {
			Settings.now = defaultNow;
		});

		it("should return a list of all events", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create several events
			 */
			const { user, organization } = await makeUserWithOrganizationMembership();
			const ctx = makeMockContext(user);
			const createEventResults = await Promise.all(
				range(3).map(() =>
					events.create(ctx, {
						type: "BASIC",
						event: {
							organizationId: organization.id,
							name: faker.person.firstName(),
							startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
							endAt: DateTime.now().plus({ days: 2 }).toJSDate(),
						},
					}),
				),
			);
			const createdEvents = createEventResults.map((res) => {
				if (!res.ok) throw res.error;
				return res.data.event;
			});

			/**
			 * Act
			 *
			 * 1. Get the event
			 */
			const actualEvents = await events.findMany();

			/**
			 * Assert
			 *
			 * 1. The events should be returned
			 */
			expect(actualEvents.length).toBeGreaterThanOrEqual(3);
			for (const expectedEvent of createdEvents) {
				expect(actualEvents.map((event) => event.id)).toContainEqual(
					expectedEvent.id,
				);
			}
		});

		it("{ onlyFutureEvents: true } should only return events in the future", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create an event in the future
			 * 2. Create an event in the past
			 */
			const { user, organization } = await makeUserWithOrganizationMembership();
			const ctx = makeMockContext(user);
			const eventInTheFuture = await events.create(ctx, {
				type: "BASIC",
				event: {
					organizationId: organization.id,
					name: faker.person.firstName(),
					startAt: DateTime.now().plus({ days: 10 }).toJSDate(),
					endAt: DateTime.now().plus({ days: 11 }).toJSDate(),
				},
			});
			const eventInThePast = await events.create(ctx, {
				type: "BASIC",
				event: {
					organizationId: organization.id,
					name: faker.person.firstName(),
					startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					endAt: DateTime.now().plus({ days: 2 }).toJSDate(),
				},
			});

			const fiveDaysAhead = DateTime.now().plus({ days: 5 }).toMillis();
			Settings.now = () => fiveDaysAhead;

			/**
			 * Act
			 *
			 * 1. Get all events with { onlyFutureEvents: true }
			 */
			const actualEvents = await events.findMany({
				onlyFutureEvents: true,
			});

			/**
			 * Assert
			 *
			 * 1. The event in the past should not be returned
			 * 2. The event in the future should be returned
			 */
			assert(eventInThePast.ok);
			assert(eventInTheFuture.ok);
			expect(actualEvents.map((event) => event.id)).not.toContain(
				eventInThePast.data.event.id,
			);
			expect(actualEvents.map((event) => event.id)).toContain(
				eventInTheFuture.data.event.id,
			);
		});
	});
});

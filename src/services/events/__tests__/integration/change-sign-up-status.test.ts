import assert, { fail } from "assert";
import { faker } from "@faker-js/faker";
import { ParticipationStatus } from "@prisma/client";
import { DateTime } from "luxon";
import { makeTestServices } from "~/__tests__/dependencies-factory.js";
import { NotFoundError } from "~/domain/errors.js";
import { makeMockContext } from "~/lib/context.js";
import type { Services } from "~/lib/server.js";
import { makeUserWithOrganizationMembership } from "./dependencies-factory.js";

describe("EventService", () => {
	let events: Services["events"];

	beforeAll(() => {
		({ events } = makeTestServices());
	});

	describe("#retractSignUp", () => {
		it("should retract confirmed sign up and increment the slot and event capacities", async () => {
			const { user, organization } = await makeUserWithOrganizationMembership();
			const ctx = makeMockContext(user);

			const createEvent = await events.create(ctx, {
				type: "SIGN_UPS",
				event: {
					organizationId: organization.id,
					name: faker.word.adjective(),
					startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					endAt: DateTime.now().plus({ days: 2 }).toJSDate(),
					signUpsEnabled: true,
					capacity: 1,
					signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
				},
				slots: [
					{
						capacity: 1,
					},
				],
			});

			assert(createEvent.ok);
			const { event } = createEvent.data;

			await events.signUp(ctx, user.id, event.id);
			const actual = await events.retractSignUp(user.id, event.id);
			const actualEvent = await events.get(event.id);
			const actualSlotsResult = await events.getSlots(ctx, {
				eventId: event.id,
			});
			assert(actualSlotsResult.ok);
			const { slots: actualSlots } = actualSlotsResult.data;
			const actualSlot = actualSlots[0];
			assert(actualSlot !== undefined);

			expect(actual.participationStatus).toBe(ParticipationStatus.RETRACTED);
			expect(actual.slotId).toBe(null);
			expect(actual.version).toBe(1);
			expect(actualEvent.remainingCapacity).toBe(1);
			expect(actualSlot.remainingCapacity).toBe(1);
		});

		it("retract wait list sign up and not increment the slot and event capacities", async () => {
			const { user, organization } = await makeUserWithOrganizationMembership();
			const ctx = makeMockContext(user);

			const createEvent = await events.create(ctx, {
				type: "SIGN_UPS",
				event: {
					organizationId: organization.id,
					name: faker.word.adjective(),
					startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					endAt: DateTime.now().plus({ days: 2 }).toJSDate(),
					signUpsEnabled: true,
					capacity: 0,
					signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
				},
				slots: [
					{
						capacity: 0,
					},
				],
			});

			assert(createEvent.ok);
			const { event } = createEvent.data;

			await events.signUp(ctx, user.id, event.id);
			const actual = await events.retractSignUp(user.id, event.id);
			const actualEvent = await events.get(event.id);
			const actualSlotsResult = await events.getSlots(ctx, {
				eventId: event.id,
			});
			assert(actualSlotsResult.ok);
			const { slots: actualSlots } = actualSlotsResult.data;
			const actualSlot = actualSlots[0];
			assert(actualSlot !== undefined);

			expect(actual.participationStatus).toBe(ParticipationStatus.RETRACTED);
			expect(actual.slotId).toBe(null);
			expect(actual.version).toBe(1);
			expect(actualEvent.remainingCapacity).toBe(0);
			expect(actualSlot.remainingCapacity).toBe(0);
		});

		it("not change an already retracted sign up", async () => {
			const { user, organization } = await makeUserWithOrganizationMembership();
			const ctx = makeMockContext(user);

			const createEvent = await events.create(ctx, {
				type: "SIGN_UPS",
				event: {
					organizationId: organization.id,
					name: faker.word.adjective(),
					startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					endAt: DateTime.now().plus({ days: 2 }).toJSDate(),
					signUpsEnabled: true,
					capacity: 1,
					signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
				},
				slots: [
					{
						capacity: 1,
					},
				],
			});

			if (!createEvent.ok) {
				throw createEvent.error;
			}
			assert(createEvent.ok);
			const { event } = createEvent.data;

			await events.signUp(ctx, user.id, event.id);
			await events.retractSignUp(user.id, event.id);

			try {
				await events.retractSignUp(user.id, event.id);
				fail("Expected an error");
			} catch (err) {
				expect(err).toBeInstanceOf(NotFoundError);
			}
			const actualEvent = await events.get(event.id);
			const actualSlotsResult = await events.getSlots(ctx, {
				eventId: event.id,
			});

			assert(actualSlotsResult.ok);
			const { slots: actualSlots } = actualSlotsResult.data;
			const actualSlot = actualSlots[0];
			assert(actualSlot !== undefined);

			expect(actualEvent.remainingCapacity).toBe(1);
			expect(actualSlot.remainingCapacity).toBe(1);
		});
	});
});

import assert, { fail } from "assert";
import { faker } from "@faker-js/faker";
import { ParticipationStatus } from "@prisma/client";
import { DateTime } from "luxon";
import { makeTestServices } from "~/__tests__/dependencies-factory.js";
import { InvalidArgumentError, NotFoundError } from "~/domain/errors.js";
import { type Context, makeMockContext } from "~/lib/context.js";
import type { Services } from "~/lib/server.js";
import { makeUserWithOrganizationMembership } from "./dependencies-factory.js";

describe("EventService", () => {
	let events: Services["events"];

	beforeAll(() => {
		({ events } = makeTestServices());
	});

	describe("#retractSignUp", () => {
		it("should retract confirmed sign up and increment the slot and event capacities", async () => {
			const { user, ctx, event } = await makeDeps({ capacity: 1 });

			const actual = await events.retractSignUp(user.id, event.id);
			const actualEvent = await mustGetEvent(event.id);
			const actualSlot = await mustGetSlot(ctx, event.id);

			expect(actual).toEqual(
				expect.objectContaining({
					participationStatus: ParticipationStatus.RETRACTED,
					slotId: null,
					version: 1,
				}),
			);
			expect(actualEvent.remainingCapacity).toBe(1);
			expect(actualSlot.remainingCapacity).toBe(1);
		});

		it("retract wait list sign up and not increment the slot and event capacities", async () => {
			const { user, ctx, event } = await makeDeps({ capacity: 0 });
			const actual = await events.retractSignUp(user.id, event.id);
			const actualEvent = await mustGetEvent(event.id);
			const actualSlot = await mustGetSlot(ctx, event.id);

			expect(actual).toEqual(
				expect.objectContaining({
					participationStatus: ParticipationStatus.RETRACTED,
					slotId: null,
					version: 1,
				}),
			);
			expect(actualEvent.remainingCapacity).toBe(0);
			expect(actualSlot.remainingCapacity).toBe(0);
		});

		it("not change an already retracted sign up", async () => {
			const { user, ctx, event } = await makeDeps({ capacity: 1 });
			await events.retractSignUp(user.id, event.id);

			try {
				await events.retractSignUp(user.id, event.id);
				fail("Expected an error");
			} catch (err) {
				expect(err).toBeInstanceOf(NotFoundError);
			}
			const actualEvent = await mustGetEvent(event.id);
			const actualSlot = await mustGetSlot(ctx, event.id);

			expect(actualEvent.remainingCapacity).toBe(1);
			expect(actualSlot.remainingCapacity).toBe(1);
		});

		it("should return InvalidArgumentError if trying to retract a confirmed sign up on a non-retractable event", async () => {
			const { event, user } = await makeDeps({
				capacity: 1,
				retractable: false,
			});
			try {
				await events.retractSignUp(user.id, event.id);
				fail("Expected an error");
			} catch (err) {
				expect(err).toBeInstanceOf(InvalidArgumentError);
			}
		});

		it("should retract a non-confirmed sign up on a non-retractable event", async () => {
			const { user, event } = await makeDeps({
				capacity: 0,
				retractable: false,
			});
			const retactSignUpResult = await events.retractSignUp(user.id, event.id);
			expect(retactSignUpResult.participationStatus).toBe(
				ParticipationStatus.RETRACTED,
			);
		});
	});

	describe("#removeSignUp", () => {
		it("removes a confirmed sign up and increments the slot and event capacities", async () => {
			const { signUp, ctx, event } = await makeDeps({ capacity: 1 });
			const actual = await events.removeSignUp(ctx, { signUpId: signUp.id });

			const actualEvent = await mustGetEvent(event.id);
			const actualSlot = await mustGetSlot(ctx, event.id);

			expect(actual).toEqual({
				ok: true,
				data: {
					signUp: expect.objectContaining({
						participationStatus: ParticipationStatus.REMOVED,
						slotId: null,
						version: 1,
						id: signUp.id,
					}),
				},
			});
			expect(actualEvent.remainingCapacity).toBe(1);
			expect(actualSlot.remainingCapacity).toBe(1);
		});

		it("removes a wait list sign up and does not increment the slot and event capacities", async () => {
			const { signUp, ctx, event } = await makeDeps({ capacity: 0 });

			const actual = await events.removeSignUp(ctx, { signUpId: signUp.id });

			const actualEvent = await mustGetEvent(event.id);
			const actualSlot = await mustGetSlot(ctx, event.id);

			expect(actual).toEqual({
				ok: true,
				data: {
					signUp: expect.objectContaining({
						participationStatus: ParticipationStatus.REMOVED,
						slotId: null,
						version: 1,
						id: signUp.id,
					}),
				},
			});
			expect(actualEvent.remainingCapacity).toBe(0);
			expect(actualSlot.remainingCapacity).toBe(0);
		});

		it("does not change an already removed sign up", async () => {
			const { signUp, ctx, event } = await makeDeps({ capacity: 1 });

			const removed = await events.removeSignUp(ctx, { signUpId: signUp.id });
			if (!removed.ok) throw removed.error;
			const actual = await events.removeSignUp(ctx, { signUpId: signUp.id });

			const actualEvent = await mustGetEvent(event.id);
			const actualSlot = await mustGetSlot(ctx, event.id);

			expect(actual).toEqual({
				ok: true,
				data: {
					signUp: removed.data.signUp,
				},
			});
			expect(actualEvent.remainingCapacity).toBe(1);
			expect(actualSlot.remainingCapacity).toBe(1);
		});

		it("removes a confirmed sign up from a non-retractable event", async () => {
			const { signUp, ctx, event } = await makeDeps({
				capacity: 1,
				retractable: false,
			});

			const actual = await events.removeSignUp(ctx, { signUpId: signUp.id });

			const actualEvent = await mustGetEvent(event.id);
			const actualSlot = await mustGetSlot(ctx, event.id);

			expect(actual).toEqual({
				ok: true,
				data: {
					signUp: expect.objectContaining({
						participationStatus: ParticipationStatus.REMOVED,
						slotId: null,
						version: 1,
						id: signUp.id,
					}),
				},
			});
			expect(actualEvent.remainingCapacity).toBe(1);
			expect(actualSlot.remainingCapacity).toBe(1);
		});

		it("removes a wait list sign up on a non-retractable event", async () => {
			const { signUp, ctx } = await makeDeps({
				capacity: 0,
				retractable: false,
			});

			const retactSignUpResult = await events.removeSignUp(ctx, {
				signUpId: signUp.id,
			});
			expect(retactSignUpResult).toEqual({
				ok: true,
				data: {
					signUp: expect.objectContaining({
						participationStatus: ParticipationStatus.REMOVED,
						slotId: null,
						version: 1,
						id: signUp.id,
					}),
				},
			});
		});
	});

	async function makeDeps(params: { capacity: number; retractable?: boolean }) {
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
				capacity: params.capacity,
				signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
				signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
				signUpsRetractable: params.retractable ?? true,
			},
			slots: [
				{
					capacity: params.capacity,
				},
			],
		});

		if (!createEvent.ok) throw createEvent.error;
		const { event } = createEvent.data;

		const signUpResult = await events.signUp(ctx, {
			userId: user.id,
			eventId: event.id,
		});
		if (!signUpResult.ok) throw signUpResult.error;
		const { signUp } = signUpResult.data;

		return { ctx, user, event, signUp };
	}

	async function mustGetEvent(id: string) {
		const event = await events.get(id);
		return event;
	}

	async function mustGetSlot(ctx: Context, eventId: string) {
		const slotsResult = await events.getSlots(ctx, {
			eventId,
		});
		if (!slotsResult.ok) throw slotsResult.error;
		const slot = slotsResult.data.slots[0];
		assert(slot !== undefined);
		return slot;
	}
});

import { faker } from "@faker-js/faker";
import { DateTime } from "luxon";
import { makeTestServices } from "~/__tests__/dependencies-factory.js";
import {
	InvalidArgumentError,
	NotFoundError,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
import { EventParticipationStatus } from "~/domain/events/sign-ups.js";
import { makeMockContext } from "~/lib/context.js";
import prisma from "~/lib/prisma.js";
import type { Services } from "~/lib/server.js";
import {
	makeDependencies,
	makeSignUp,
	makeUserWithOrganizationMembership,
	mustGetEvent,
	mustGetSlot,
} from "./dependencies-factory.js";

describe("EventService", () => {
	let events: Services["events"];

	beforeAll(() => {
		({ events } = makeTestServices());
	});

	describe("#retractSignUp", () => {
		it("should retract confirmed sign up and increment the slot and event capacities", async () => {
			const { ctx, event } = await makeDependencies({ capacity: 1 });
			await makeSignUp(ctx, { eventId: event.id });

			const actual = await events.retractSignUp(ctx, { eventId: event.id });
			const actualEvent = await mustGetEvent(event.id);
			const actualSlot = await mustGetSlot(ctx, event.id);

			expect(actual).toEqual({
				ok: true,
				data: {
					signUp: expect.objectContaining({
						participationStatus: EventParticipationStatus.RETRACTED,
						slotId: null,
						version: 1,
					}),
				},
			});
			expect(actualEvent.remainingCapacity).toBe(1);
			expect(actualSlot.remainingCapacity).toBe(1);
		});

		it("returns UnauthorizedError if not logged in", async () => {
			const { ctx, event } = await makeDependencies({ capacity: 1 });
			await makeSignUp(ctx, { eventId: event.id });

			const actual = await events.retractSignUp(makeMockContext(null), {
				eventId: event.id,
			});

			expect(actual).toEqual({
				ok: false,
				error: expect.any(UnauthorizedError),
			});
		});

		it("retract wait list sign up and not increment the slot and event capacities", async () => {
			const { ctx, event } = await makeDependencies({ capacity: 0 });
			await makeSignUp(ctx, { eventId: event.id });

			const actual = await events.retractSignUp(ctx, { eventId: event.id });
			const actualEvent = await mustGetEvent(event.id);
			const actualSlot = await mustGetSlot(ctx, event.id);

			expect(actual).toEqual({
				ok: true,
				data: {
					signUp: expect.objectContaining({
						participationStatus: EventParticipationStatus.RETRACTED,
						slotId: null,
						version: 1,
					}),
				},
			});
			expect(actualEvent.remainingCapacity).toBe(0);
			expect(actualSlot.remainingCapacity).toBe(0);
		});

		it("returns NotFoundError if the sign up is not active", async () => {
			const { ctx, event } = await makeDependencies({ capacity: 1 });
			await makeSignUp(ctx, { eventId: event.id });

			const removed = await events.retractSignUp(ctx, { eventId: event.id });
			if (!removed.ok) throw removed.error;
			const actual = await events.retractSignUp(ctx, { eventId: event.id });
			expect(actual).toEqual({
				ok: false,
				error: expect.any(NotFoundError),
			});

			const actualEvent = await mustGetEvent(event.id);
			const actualSlot = await mustGetSlot(ctx, event.id);

			expect(actualEvent.remainingCapacity).toBe(1);
			expect(actualSlot.remainingCapacity).toBe(1);
		});

		it("returns InvalidArgumentError if trying to retract a confirmed sign up on a non-retractable event", async () => {
			const { event, ctx } = await makeDependencies({
				capacity: 1,
				retractable: false,
			});
			await makeSignUp(ctx, { eventId: event.id });

			const actual = await events.retractSignUp(ctx, { eventId: event.id });
			expect(actual).toEqual({
				ok: false,
				error: expect.any(InvalidArgumentError),
			});
		});

		it("should retract a non-confirmed sign up on a non-retractable event", async () => {
			const { event, ctx } = await makeDependencies({
				capacity: 0,
				retractable: false,
			});
			await makeSignUp(ctx, { eventId: event.id });

			const actual = await events.retractSignUp(ctx, { eventId: event.id });
			expect(actual).toEqual({
				ok: true,
				data: {
					signUp: expect.objectContaining({
						participationStatus: EventParticipationStatus.RETRACTED,
					}),
				},
			});
		});

		it("returns InvalidArgumentError if retracting a confirmed sign up after sign ups have closed", async () => {
			const { event, ctx } = await makeDependencies({
				capacity: 1,
				retractable: true,
				signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
			});
			await makeSignUp(ctx, { eventId: event.id });

			await events.update(ctx, {
				event: {
					id: event.id,
					signUpsEndAt: DateTime.now().minus({ hours: 1 }).toJSDate(),
				},
			});

			const actual = await events.retractSignUp(ctx, { eventId: event.id });
			expect(actual).toEqual({
				ok: false,
				error: expect.any(InvalidArgumentError),
			});
		});

		it("returns InvalidArgumentError if attempting to retract a sign up on a basic event", async () => {
			const { eventService, organization, ctx } = await makeDependencies({
				capacity: 1,
				retractable: false,
				signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
			});
			const createEventResult = await eventService.create(ctx, {
				event: {
					name: faker.word.adjective(),
					organizationId: organization.id,
					startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
				},
				type: "BASIC",
			});
			if (!createEventResult.ok) throw createEventResult.error;
			const event = createEventResult.data.event;

			const actual = await events.retractSignUp(ctx, { eventId: event.id });
			expect(actual).toEqual({
				ok: false,
				error: expect.any(InvalidArgumentError),
			});
		});
	});

	describe("#removeSignUp", () => {
		it("removes a confirmed sign up and increments the slot and event capacities", async () => {
			const { ctx, event } = await makeDependencies({ capacity: 1 });

			const signUp = await makeSignUp(ctx, { eventId: event.id });
			const actual = await events.removeSignUp(ctx, { signUpId: signUp.id });

			const actualEvent = await mustGetEvent(event.id);
			const actualSlot = await mustGetSlot(ctx, event.id);

			expect(actual).toEqual({
				ok: true,
				data: {
					signUp: expect.objectContaining({
						participationStatus: EventParticipationStatus.REMOVED,
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
			const { ctx, event } = await makeDependencies({ capacity: 0 });

			const signUp = await makeSignUp(ctx, { eventId: event.id });
			const actual = await events.removeSignUp(ctx, { signUpId: signUp.id });

			const actualEvent = await mustGetEvent(event.id);
			const actualSlot = await mustGetSlot(ctx, event.id);

			expect(actual).toEqual({
				ok: true,
				data: {
					signUp: expect.objectContaining({
						participationStatus: EventParticipationStatus.REMOVED,
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
			const { ctx, event } = await makeDependencies({ capacity: 1 });

			const signUp = await makeSignUp(ctx, { eventId: event.id });
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
			const { ctx, event } = await makeDependencies({
				capacity: 1,
				retractable: false,
			});

			const signUp = await makeSignUp(ctx, { eventId: event.id });
			const actual = await events.removeSignUp(ctx, { signUpId: signUp.id });

			const actualEvent = await mustGetEvent(event.id);
			const actualSlot = await mustGetSlot(ctx, event.id);

			expect(actual).toEqual({
				ok: true,
				data: {
					signUp: expect.objectContaining({
						participationStatus: EventParticipationStatus.REMOVED,
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
			const { ctx, event } = await makeDependencies({
				capacity: 0,
				retractable: false,
			});

			const signUp = await makeSignUp(ctx, { eventId: event.id });
			const retactSignUpResult = await events.removeSignUp(ctx, {
				signUpId: signUp.id,
			});
			expect(retactSignUpResult).toEqual({
				ok: true,
				data: {
					signUp: expect.objectContaining({
						participationStatus: EventParticipationStatus.REMOVED,
						slotId: null,
						version: 1,
						id: signUp.id,
					}),
				},
			});
		});

		it("returns UnauthorizedError if not authenticated", async () => {
			const { ctx, event } = await makeDependencies({
				capacity: 0,
				retractable: false,
			});

			const signUp = await makeSignUp(ctx, { eventId: event.id });
			const retactSignUpResult = await events.removeSignUp(
				makeMockContext(null),
				{
					signUpId: signUp.id,
				},
			);
			expect(retactSignUpResult).toEqual({
				ok: false,
				error: expect.any(UnauthorizedError),
			});
		});

		it("returns PermissionDenied if not a member of the organization", async () => {
			const { event, ctx } = await makeDependencies({
				capacity: 0,
				retractable: false,
			});

			const signUp = await makeSignUp(ctx, { eventId: event.id });
			const { user: userInOtherOrg } =
				await makeUserWithOrganizationMembership();

			const retactSignUpResult = await events.removeSignUp(
				makeMockContext(userInOtherOrg),
				{
					signUpId: signUp.id,
				},
			);
			expect(retactSignUpResult).toEqual({
				ok: false,
				error: expect.any(PermissionDeniedError),
			});
		});

		it("returns NotFound if the sign up does not exist", async () => {
			const { ctx } = await makeDependencies({
				capacity: 0,
				retractable: false,
			});

			const retactSignUpResult = await events.removeSignUp(ctx, {
				signUpId: faker.string.uuid(),
			});
			expect(retactSignUpResult).toEqual({
				ok: false,
				error: expect.any(NotFoundError),
			});
		});

		it("returns InvalidArgument if the organization who had the event has been deleted", async () => {
			const { ctx, organization, event } = await makeDependencies({
				capacity: 0,
				retractable: false,
			});
			const signUp = await makeSignUp(ctx, { eventId: event.id });

			await prisma.organization.delete({
				where: {
					id: organization.id,
				},
			});

			const retactSignUpResult = await events.removeSignUp(ctx, {
				signUpId: signUp.id,
			});
			expect(retactSignUpResult).toEqual({
				ok: false,
				error: expect.any(InvalidArgumentError),
			});
		});
	});
});

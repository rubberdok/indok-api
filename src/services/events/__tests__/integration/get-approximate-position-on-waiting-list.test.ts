import { makeMockContext } from "~/lib/context.js";
import {
	makeDependencies,
	makeUserWithOrganizationMembership,
} from "./dependencies-factory.js";
import { faker } from "@faker-js/faker";
import { DateTime } from "luxon";
import assert from "assert";
import {
	InvalidArgumentError,
	NotFoundError,
	UnauthorizedError,
} from "~/domain/errors.js";

describe("EventService", () => {
	describe("#getApproximatePositionOnWaitingList", () => {
		it("returns the approximate position on the waiting list", async () => {
			const { eventService } = makeDependencies();
			const { user, organization } = await makeUserWithOrganizationMembership();
			const { user: otherUser } = await makeUserWithOrganizationMembership();
			const ctx = makeMockContext(user);

			/**
			 * Create an event, and sign up a user to the event.
			 */
			const createEventResult = await eventService.create(ctx, {
				type: "SIGN_UPS",
				event: {
					capacity: 0,
					organizationId: organization.id,
					name: faker.word.adjective(),
					signUpsEndAt: DateTime.now().plus({ years: 1 }).toJSDate(),
					signUpsStartAt: DateTime.now().toJSDate(),
					startAt: DateTime.now().plus({ years: 1 }).toJSDate(),
					endAt: DateTime.now().plus({ years: 2 }).toJSDate(),
					signUpsEnabled: true,
				},
				slots: [{ capacity: 0 }],
			});
			if (!createEventResult.ok) throw createEventResult.error;
			const { event } = createEventResult.data;

			await eventService.signUp(makeMockContext(otherUser), {
				eventId: event.id,
				userId: otherUser.id,
			});
			await eventService.signUp(makeMockContext(user), {
				eventId: event.id,
				userId: user.id,
			});

			/**
			 * Get the approximate position on the waiting list for the user.
			 */
			const getApproximatePositionResult =
				await eventService.getApproximatePositionOnWaitingList(ctx, {
					eventId: event.id,
				});
			if (!getApproximatePositionResult.ok)
				throw getApproximatePositionResult.error;

			const { position } = getApproximatePositionResult.data;
			expect(position).toBe(2);
		});

		it("returns the approximate position on the waiting list if there are confirmed sign ups", async () => {
			const { eventService } = makeDependencies();
			const { user, organization } = await makeUserWithOrganizationMembership();
			const { user: otherUser } = await makeUserWithOrganizationMembership();
			const ctx = makeMockContext(user);

			/**
			 * Create an event, and sign up a user to the event.
			 */
			const createEventResult = await eventService.create(ctx, {
				type: "SIGN_UPS",
				event: {
					capacity: 1,
					organizationId: organization.id,
					name: faker.word.adjective(),
					signUpsEndAt: DateTime.now().plus({ years: 1 }).toJSDate(),
					signUpsStartAt: DateTime.now().toJSDate(),
					startAt: DateTime.now().plus({ years: 1 }).toJSDate(),
					endAt: DateTime.now().plus({ years: 2 }).toJSDate(),
					signUpsEnabled: true,
				},
				slots: [{ capacity: 1 }],
			});
			if (!createEventResult.ok) throw createEventResult.error;
			const { event } = createEventResult.data;

			await eventService.signUp(makeMockContext(otherUser), {
				eventId: event.id,
				userId: otherUser.id,
			});
			await eventService.signUp(makeMockContext(user), {
				eventId: event.id,
				userId: user.id,
			});

			/**
			 * Get the approximate position on the waiting list for the user.
			 */
			const getApproximatePositionResult =
				await eventService.getApproximatePositionOnWaitingList(ctx, {
					eventId: event.id,
				});
			if (!getApproximatePositionResult.ok)
				throw getApproximatePositionResult.error;

			const { position } = getApproximatePositionResult.data;
			expect(position).toBe(1);
		});

		it("returns UnauthorizedError if the user is not logged in", async () => {
			const { eventService } = makeDependencies();

			/**
			 * Get the approximate position on the waiting list for the user.
			 */
			const getApproximatePositionResult =
				await eventService.getApproximatePositionOnWaitingList(
					makeMockContext(null),
					{
						eventId: faker.string.uuid(),
					},
				);
			assert(getApproximatePositionResult.ok === false);
			expect(getApproximatePositionResult.error).toBeInstanceOf(
				UnauthorizedError,
			);
		});

		it("returns NotFoundError if the user does not have a sign up on the event", async () => {
			const { eventService } = makeDependencies();
			const { user, organization } = await makeUserWithOrganizationMembership();
			/**
			 * Create an event
			 */
			const createEventResult = await eventService.create(
				makeMockContext(user),
				{
					type: "SIGN_UPS",
					event: {
						capacity: 1,
						organizationId: organization.id,
						name: faker.word.adjective(),
						signUpsEndAt: DateTime.now().plus({ years: 1 }).toJSDate(),
						signUpsStartAt: DateTime.now().toJSDate(),
						startAt: DateTime.now().plus({ years: 1 }).toJSDate(),
						endAt: DateTime.now().plus({ years: 2 }).toJSDate(),
						signUpsEnabled: true,
					},
					slots: [{ capacity: 1 }],
				},
			);
			if (!createEventResult.ok) throw createEventResult.error;
			const { event } = createEventResult.data;

			/**
			 * Get the approximate position on the waiting list for the user.
			 */
			const getApproximatePositionResult =
				await eventService.getApproximatePositionOnWaitingList(
					makeMockContext(user),
					{
						eventId: event.id,
					},
				);
			assert(getApproximatePositionResult.ok === false);
			expect(getApproximatePositionResult.error).toBeInstanceOf(NotFoundError);
		});

		it("returns InvalidArgumentError if the user is not on the wait list", async () => {
			const { eventService } = makeDependencies();
			const { user, organization } = await makeUserWithOrganizationMembership();
			/**
			 * Create an event
			 */
			const createEventResult = await eventService.create(
				makeMockContext(user),
				{
					type: "SIGN_UPS",
					event: {
						capacity: 1,
						organizationId: organization.id,
						name: faker.word.adjective(),
						signUpsEndAt: DateTime.now().plus({ years: 1 }).toJSDate(),
						signUpsStartAt: DateTime.now().toJSDate(),
						startAt: DateTime.now().plus({ years: 1 }).toJSDate(),
						endAt: DateTime.now().plus({ years: 2 }).toJSDate(),
						signUpsEnabled: true,
					},
					slots: [{ capacity: 1 }],
				},
			);
			if (!createEventResult.ok) throw createEventResult.error;
			const { event } = createEventResult.data;

			await eventService.signUp(makeMockContext(user), {
				eventId: event.id,
				userId: user.id,
			});

			/**
			 * Get the approximate position on the waiting list for the user.
			 */
			const getApproximatePositionResult =
				await eventService.getApproximatePositionOnWaitingList(
					makeMockContext(user),
					{
						eventId: event.id,
					},
				);
			assert(getApproximatePositionResult.ok === false);
			expect(getApproximatePositionResult.error).toBeInstanceOf(
				InvalidArgumentError,
			);
		});

		it("returns InvalidArgumentError if the event does not exist", async () => {
			const { eventService } = makeDependencies();
			const { user } = await makeUserWithOrganizationMembership();

			/**
			 * Get the approximate position on the waiting list for the user.
			 */
			const getApproximatePositionResult =
				await eventService.getApproximatePositionOnWaitingList(
					makeMockContext(user),
					{
						eventId: faker.string.uuid(),
					},
				);
			assert(getApproximatePositionResult.ok === false);
			expect(getApproximatePositionResult.error).toBeInstanceOf(NotFoundError);
		});
	});
});

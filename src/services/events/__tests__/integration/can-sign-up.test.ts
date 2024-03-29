import { faker } from "@faker-js/faker";
import { DateTime } from "luxon";
import {
	EventParticipationStatus,
	type EventParticipationStatusType,
} from "~/domain/events/sign-ups.js";
import { makeMockContext } from "~/lib/context.js";
import prisma from "~/lib/prisma.js";
import type { EventService } from "../../service.js";
import {
	makeServices,
	makeUserWithOrganizationMembership,
} from "./dependencies-factory.js";

describe("EventService", () => {
	let eventService: EventService;

	beforeAll(() => {
		({ eventService } = makeServices());
	});

	describe("canSignUpForEvent", () => {
		interface TestCase {
			name: string;
			arrange: {
				user?: {
					graduationYear?: number;
				};
				signUpsEnabled: boolean;
				capacity: number;
				signUpsStartAt: Date;
				signUpsEndAt: Date;
				slots: {
					capacity: number;
					gradeYears?: number[];
				}[];
				signUp?: { participationStatus: EventParticipationStatusType };
			};
			expected: boolean;
		}

		const testCases: TestCase[] = [
			{
				name: "if the user does not have a sign up for the event, and there is capacity on the event and a slot",
				arrange: {
					signUpsEnabled: true,
					signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					capacity: 1,
					slots: [
						{
							capacity: 1,
						},
					],
				},
				expected: true,
			},
			{
				name: "if the user has an inactive sign up for the event, and there is capacity on the event and a slot",
				arrange: {
					signUpsEnabled: true,
					signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					capacity: 2,
					slots: [
						{
							capacity: 2,
						},
					],
					signUp: {
						participationStatus: EventParticipationStatus.REMOVED,
					},
				},
				expected: true,
			},
			{
				name: "if the user has an active sign up for the event, even if there is capacity on the event and slot",
				arrange: {
					signUpsEnabled: true,
					signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					capacity: 1,
					slots: [
						{
							capacity: 1,
						},
					],
					signUp: {
						participationStatus: EventParticipationStatus.CONFIRMED,
					},
				},
				expected: false,
			},
			{
				name: "if there is no capacity on the event, even if there is capacity in a slot",
				arrange: {
					signUpsEnabled: true,
					signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					capacity: 0,
					slots: [
						{
							capacity: 1,
						},
					],
				},
				expected: false,
			},
			{
				name: "if signUpsEnabled: false, even if there is capacity",
				arrange: {
					signUpsEnabled: false,
					signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					capacity: 1,
					slots: [
						{
							capacity: 1,
						},
					],
				},
				expected: false,
			},
			{
				name: "if there is no slot with capacity on the event, even if there is capacity on the event",
				arrange: {
					signUpsEnabled: true,
					signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					capacity: 1,
					slots: [
						{
							capacity: 0,
						},
					],
				},
				expected: false,
			},
			{
				name: "if sign ups have not started",
				arrange: {
					signUpsEnabled: true,
					signUpsEndAt: DateTime.now().plus({ days: 2 }).toJSDate(),
					signUpsStartAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					capacity: 1,
					slots: [
						{
							capacity: 1,
						},
					],
				},
				expected: false,
			},
			{
				name: "if a slot is available for the user's grade year",
				arrange: {
					user: {
						graduationYear: DateTime.now().year + 1,
					},
					signUpsEnabled: true,
					signUpsEndAt: DateTime.now().plus({ days: 2 }).toJSDate(),
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					capacity: 1,
					slots: [
						{
							gradeYears: [1, 2, 3, 4, 5],
							capacity: 1,
						},
					],
				},
				expected: true,
			},
			{
				name: "if a slot is not available for the user's grade year",
				arrange: {
					user: {
						graduationYear: DateTime.now().year + 3,
					},
					signUpsEnabled: true,
					signUpsEndAt: DateTime.now().plus({ days: 2 }).toJSDate(),
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					capacity: 1,
					slots: [
						{
							gradeYears: [1],
							capacity: 1,
						},
					],
				},
				expected: false,
			},
			{
				name: "if at least one slot is available for the user's grade year",
				arrange: {
					user: {
						graduationYear: DateTime.now().year + 3,
					},
					signUpsEnabled: true,
					signUpsEndAt: DateTime.now().plus({ days: 2 }).toJSDate(),
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					capacity: 1,
					slots: [
						{
							gradeYears: [1, 2, 3, 4, 5],
							capacity: 1,
						},
						{
							gradeYears: [1, 2, 3, 4, 5],
							capacity: 1,
						},
						{
							gradeYears: [1, 2, 3, 4, 5],
							capacity: 1,
						},
						{
							gradeYears: [1, 2, 3, 4, 5],
							capacity: 1,
						},
					],
				},
				expected: true,
			},
			{
				name: "if there is a slot open for all grade years and the user has not set their graduation year",
				arrange: {
					user: {},
					signUpsEnabled: true,
					signUpsEndAt: DateTime.now().plus({ days: 2 }).toJSDate(),
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					capacity: 1,
					slots: [
						{
							gradeYears: [1, 2, 3, 4, 5],
							capacity: 1,
						},
					],
				},
				expected: true,
			},
			{
				name: "if there is not a slot open for all grade years and the user has not set their graduation year",
				arrange: {
					user: {},
					signUpsEnabled: true,
					signUpsEndAt: DateTime.now().plus({ days: 2 }).toJSDate(),
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					capacity: 1,
					slots: [
						{
							gradeYears: [2, 3, 4, 5],
							capacity: 1,
						},
					],
				},
				expected: false,
			},
		];

		test.each(testCases)(
			"should return $expected $name",
			async ({ arrange, expected }) => {
				/**
				 * Arrange
				 *
				 * Create a user to create the event
				 * Create an event with the capacity specified in the test case
				 * Create a slot with the capacity specified in the test case
				 * Create a sign up for the user and the event with the participation status specified in the test case
				 * if the participation status is CONFIRMED, create a sign up for the user and the slot
				 */
				const { user, organization } = await makeUserWithOrganizationMembership(
					arrange.user,
				);
				const ctx = makeMockContext(user);
				const event = await eventService.create(ctx, {
					event: {
						organizationId: organization.id,
						name: faker.word.adjective(),
						startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
						endAt: DateTime.now().plus({ days: 2 }).toJSDate(),
						signUpsEnabled: arrange.signUpsEnabled,
						capacity: arrange.capacity,
						signUpsStartAt: arrange.signUpsStartAt,
						signUpsEndAt: arrange.signUpsEndAt,
						signUpsRetractable: true,
					},
					slots: arrange.slots,
					type: "SIGN_UPS",
				});
				if (!event.ok) throw event.error;

				if (arrange.signUp) {
					await eventService.signUp(ctx, {
						userId: user.id,
						eventId: event.data.event.id,
					});
					if (
						arrange.signUp.participationStatus === "RETRACTED" ||
						arrange.signUp.participationStatus === "REMOVED"
					) {
						await eventService.retractSignUp(ctx, {
							eventId: event.data.event.id,
						});
					}
				}

				/**
				 * Act
				 *
				 * Call the canSignUpForEvent function with the user and the event
				 */
				const actual = await eventService.canSignUpForEvent(
					makeMockContext(user),
					{ eventId: event.data.event.id },
				);

				/**
				 * Assert
				 *
				 * Assert that the result is the expected result
				 */
				expect(actual).toBe(expected);
			},
		);

		it("should return false if sign ups have ended", async () => {
			/**
			 * Arrange
			 *
			 * Create a user to create the event
			 * Create an event with the capacity specified in the test case
			 * Create a slot with the capacity specified in the test case
			 */
			const { user, organization } = await makeUserWithOrganizationMembership();
			const event = await prisma.event.create({
				data: {
					type: "SIGN_UPS",
					name: faker.word.adjective(),
					startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					endAt: DateTime.now().plus({ days: 2 }).toJSDate(),
					organizationId: organization.id,
					capacity: 1,
					remainingCapacity: 1,
					signUpsEnabled: true,
					signUpsStartAt: DateTime.now()
						.minus({ days: 1, hours: 2 })
						.toJSDate(),
					signUpsEndAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					slots: {
						create: {
							capacity: 1,
							remainingCapacity: 1,
						},
					},
				},
			});

			/**
			 * Act
			 *
			 * Call the canSignUpForEvent function with the user and the event
			 */
			const actual = await eventService.canSignUpForEvent(
				makeMockContext(user),
				{ eventId: event.id },
			);

			/**
			 * Assert
			 *
			 * Assert that the result is the expected result
			 */
			expect(actual).toBe(false);
		});
	});
});

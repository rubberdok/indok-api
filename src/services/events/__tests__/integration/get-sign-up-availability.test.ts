import { DateTime } from "luxon";
import type {
	EventParticipationStatusType,
	SignUpAvailability,
} from "~/domain/events/index.js";
import { makeMockContext } from "~/lib/context.js";
import prisma from "~/lib/prisma.js";
import type { EventService } from "../../service.js";
import { makeDependencies, makeServices } from "./dependencies-factory.js";

describe("EventService", () => {
	let eventService: EventService;

	beforeAll(() => {
		({ eventService } = makeServices());
	});

	describe("#getSignUpAvailability", () => {
		interface TestCase {
			name: string;
			arrange: {
				user?: {
					graduationYear?: number;
				} | null;
				signUpsEnabled: boolean;
				capacity: number;
				signUpsStartAt: Date;
				signUpsEndAt: Date;
				signUp?: {
					participationStatus: EventParticipationStatusType;
					active: boolean;
				};
				slots: {
					capacity: number;
					gradeYears?: number[];
				}[];
			};
			expected: SignUpAvailability;
		}

		const testCases: TestCase[] = [
			{
				name: "if the user is `null`, and sign ups are enabled",
				arrange: {
					user: null,
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
				expected: "UNAVAILABLE",
			},
			{
				name: "if sign ups are disabled",
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
				expected: "DISABLED",
			},
			{
				name: "if sign ups have not started yet",
				arrange: {
					user: { graduationYear: DateTime.now().year + 1 },
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
				expected: "NOT_OPEN",
			},
			{
				name: "if there are no slots for this user's grade year, regardless of capacity",
				arrange: {
					user: { graduationYear: DateTime.now().year + 1 },
					signUpsEnabled: true,
					signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					capacity: 0,
					slots: [
						{
							capacity: 1,
							gradeYears: [1],
						},
						{
							capacity: 100,
							gradeYears: [2],
						},
					],
				},
				expected: "UNAVAILABLE",
			},
			{
				name: "if the event is full, and the user is not signed up",
				arrange: {
					user: { graduationYear: DateTime.now().year + 1 },
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
				expected: "WAITLIST_AVAILABLE",
			},
			{
				name: "if all slots for the user's grade year are full, and the user is not signed up",
				arrange: {
					user: { graduationYear: DateTime.now().year + 1 },
					signUpsEnabled: true,
					signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					capacity: 1,
					slots: [
						{
							gradeYears: [4, 5],
							capacity: 0,
						},
						{
							gradeYears: [1, 2],
							capacity: 10,
						},
					],
				},
				expected: "WAITLIST_AVAILABLE",
			},
			{
				name: "if the user can sign up for the event as a confirmed sign up",
				arrange: {
					user: {
						graduationYear: DateTime.now().year + 1,
					},
					signUpsEnabled: true,
					signUpsEndAt: DateTime.now().plus({ days: 2 }).toJSDate(),
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					capacity: 10,
					slots: [
						{
							gradeYears: [4, 5],
							capacity: 10,
						},
					],
				},
				expected: "AVAILABLE",
			},
			{
				name: "if the user already has a confirmed sign up for the event",
				arrange: {
					user: {
						graduationYear: DateTime.now().year + 3,
					},
					signUp: {
						participationStatus: "CONFIRMED",
						active: true,
					},
					signUpsEnabled: true,
					signUpsEndAt: DateTime.now().plus({ days: 2 }).toJSDate(),
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					capacity: 10,
					slots: [
						{
							gradeYears: [1, 2, 3, 4, 5],
							capacity: 10,
						},
					],
				},
				expected: "CONFIRMED",
			},
			{
				name: "if the user already has a wait list sign up for the event",
				arrange: {
					user: {
						graduationYear: DateTime.now().year + 3,
					},
					signUp: {
						participationStatus: "ON_WAITLIST",
						active: true,
					},
					signUpsEnabled: true,
					signUpsEndAt: DateTime.now().plus({ days: 2 }).toJSDate(),
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					capacity: 10,
					slots: [
						{
							gradeYears: [1, 2, 3, 4, 5],
							capacity: 10,
						},
					],
				},
				expected: "ON_WAITLIST",
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
				expected: "AVAILABLE",
			},
			{
				name: "if the event is full and the user is signed up",
				arrange: {
					user: {},
					signUp: {
						participationStatus: "CONFIRMED",
						active: true,
					},
					signUpsEnabled: true,
					signUpsEndAt: DateTime.now().plus({ days: 2 }).toJSDate(),
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					capacity: 0,
					slots: [
						{
							gradeYears: [2, 3, 4, 5],
							capacity: 0,
						},
					],
				},
				expected: "CONFIRMED",
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
				expected: "UNAVAILABLE",
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
				const { event, user } = await makeDependencies(
					{
						capacity: arrange.capacity,
						signUpsEnabled: arrange.signUpsEnabled,
						slots: arrange.slots,
						signUpsEndAt: arrange.signUpsEndAt,
						signUpsStartAt: arrange.signUpsStartAt,
					},
					arrange.user,
				);

				if (arrange.signUp) {
					await prisma.eventSignUp.create({
						data: {
							event: { connect: { id: event.id } },
							user: { connect: { id: user.id } },
							participationStatus: arrange.signUp.participationStatus,
							active: arrange.signUp.active,
						},
					});
				}

				/**
				 * Act
				 *
				 * Call the canSignUpForEvent function with the user and the event
				 */
				const actual = await eventService.getSignUpAvailability(
					makeMockContext(arrange.user !== null ? user : null),
					{ eventId: event.id },
				);

				/**
				 * Assert
				 *
				 * Assert that the result is the expected result
				 */
				expect(actual).toBe(expected);
			},
		);

		it("should return CLOSED if sign ups have ended", async () => {
			/**
			 * Arrange
			 *
			 * Create a user to create the event
			 * Create an event with the capacity specified in the test case
			 * Create a slot with the capacity specified in the test case
			 */
			const { event, ctx, eventService } = await makeDependencies({
				capacity: 1,
			});

			// Close the event sign ups by changing  signUpsEndAt to be in the past
			await eventService.update(ctx, {
				event: {
					id: event.id,
					signUpsEndAt: DateTime.now().minus({ hours: 1 }).toJSDate(),
				},
			});

			/**
			 * Act
			 *
			 * Call the canSignUpForEvent function with the user and the event
			 */
			const actual = await eventService.getSignUpAvailability(ctx, {
				eventId: event.id,
			});

			/**
			 * Assert
			 *
			 * Assert that the result is the expected result
			 */
			expect(actual).toBe("CLOSED");
		});
	});
});

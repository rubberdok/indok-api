import { faker } from "@faker-js/faker";
import type { ParticipationStatus } from "@prisma/client";
import { DateTime } from "luxon";
import type { SignUpAvailability } from "~/domain/events/index.js";
import prisma from "~/lib/prisma.js";
import { makeMockContext } from "~/lib/context.js";
import type { EventService } from "../../service.js";
import {
	makeDependencies,
	makeUserWithOrganizationMembership,
} from "./dependencies-factory.js";

describe("EventService", () => {
	let eventService: EventService;

	beforeAll(() => {
		({ eventService } = makeDependencies());
	});

	describe("#getSignUpAvailability", () => {
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
				signUp?: { participationStatus: ParticipationStatus; active: boolean };
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
				const { user, organization } = await makeUserWithOrganizationMembership(
					arrange.user ?? {},
				);
				const event = await eventService.create(makeMockContext(user), {
					event: {
						organizationId: organization.id,
						name: faker.word.adjective(),
						startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
						endAt: DateTime.now().plus({ days: 2 }).toJSDate(),
						signUpsEnabled: arrange.signUpsEnabled,
						capacity: arrange.capacity,
						signUpsEndAt: arrange.signUpsEndAt,
						signUpsStartAt: arrange.signUpsStartAt,
					},
					slots: arrange.slots,
					type: "SIGN_UPS",
				});

				if (!event.ok) throw event.error;
				if (arrange.signUp) {
					await prisma.eventSignUp.create({
						data: {
							event: { connect: { id: event.data.event.id } },
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
					arrange.user && user.id,
					event.data.event.id,
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
			const actual = await eventService.getSignUpAvailability(
				user.id,
				event.id,
			);

			/**
			 * Assert
			 *
			 * Assert that the result is the expected result
			 */
			expect(actual).toBe("CLOSED");
		});
	});
});

import assert from "assert";
import { faker } from "@faker-js/faker";
import { type Organization, ParticipationStatus } from "@prisma/client";
import { DateTime } from "luxon";
import { InvalidArgumentError } from "~/domain/errors.js";
import { type User, newUserFromDSO } from "~/domain/users.js";
import { makeMockContext } from "~/lib/context.js";
import prisma from "~/lib/prisma.js";
import type { EventService } from "../../service.js";
import { makeDependencies } from "./dependencies-factory.js";

describe("Event Sign Up", () => {
	let eventService: EventService;

	beforeAll(async () => {
		({ eventService } = makeDependencies());
		await prisma.organization.deleteMany({});
	});

	describe("signUp", () => {
		it("should sign up a user for an event with remaining capacity", async () => {
			/**
			 * Arrange.
			 *
			 * 1. Create an organization to host the event.
			 * 2. Create an event with capacity.
			 * 3. Create a slot for the event with capacity.
			 * 4. Create a user to sign up for the event.
			 */
			const { organization, user } = await makeUserWithOrganizationMembership();
			const createEventResult = await eventService.create(
				makeMockContext(user),
				{
					event: {
						name: faker.color.human(),
						description: faker.lorem.paragraph(),
						startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
						endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
						signUpsEnabled: true,
						organizationId: organization.id,
						capacity: 1,
						signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
						signUpsEndAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
					},
					slots: [
						{
							capacity: 1,
						},
					],
					type: "SIGN_UPS",
				},
			);

			assert(createEventResult.ok);
			/**
			 * Act.
			 *
			 * 1. Sign up the user for the event.
			 */
			const actual = await eventService.signUp(
				makeMockContext(),
				user.id,
				createEventResult.data.event.id,
			);

			/**
			 * Assert.
			 *
			 * 1. User should be signed up for the event with status CONFIRMED
			 */
			expect(actual.participationStatus).toEqual(ParticipationStatus.CONFIRMED);
			expect(actual.userId).toEqual(user.id);
			expect(actual.eventId).toEqual(createEventResult.data.event.id);
			expect(actual.slotId).not.toBeNull();
		});

		it("should sign up a user for an event with remaining capacity if there is a slot for their grade year", async () => {
			/**
			 * Arrange.
			 *
			 * 1. Create an organization to host the event.
			 * 2. Create an event with capacity.
			 * 3. Create a slot for the event with capacity.
			 * 4. Create a user to sign up for the event.
			 */
			const { organization, user } = await makeUserWithOrganizationMembership({
				graduationYear: DateTime.now().plus({ years: 3 }).year,
			});
			const createEventResult = await eventService.create(
				makeMockContext(user),
				{
					type: "SIGN_UPS",
					event: {
						organizationId: organization.id,
						name: faker.color.human(),
						description: faker.lorem.paragraph(),
						startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
						endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
						signUpsEnabled: true,
						capacity: 1,
						signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
						signUpsEndAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
					},
					slots: [
						{
							gradeYears: [1, 2, 3],
							capacity: 1,
						},
					],
				},
			);
			assert(createEventResult.ok);

			/**
			 * Act.
			 *
			 * 1. Sign up the user for the event.
			 */
			const actual = await eventService.signUp(
				makeMockContext(),
				user.id,
				createEventResult.data.event.id,
			);

			/**
			 * Assert.
			 *
			 * 1. User should be signed up for the event with status CONFIRMED
			 */
			expect(actual.participationStatus).toEqual(ParticipationStatus.CONFIRMED);
			expect(actual.userId).toEqual(user.id);
			expect(actual.eventId).toEqual(createEventResult.data.event.id);
			expect(actual.slotId).not.toBeNull();
		});

		it("should add the user to the wait list if there are no slots for their year", async () => {
			/**
			 * Arrange.
			 *
			 * 1. Create an organization to host the event.
			 * 2. Create an event with capacity.
			 * 3. Create a slot for the event with capacity.
			 * 4. Create a user to sign up for the event.
			 */
			const { organization, user } = await makeUserWithOrganizationMembership({
				graduationYear: DateTime.now().plus({ years: 1 }).year,
			});
			const event = await eventService.create(makeMockContext(user), {
				event: {
					organizationId: organization.id,
					name: faker.color.human(),
					description: faker.lorem.paragraph(),
					startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
					signUpsEnabled: true,
					capacity: 1,
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					signUpsEndAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
				},
				slots: [
					{
						gradeYears: [1],
						capacity: 1,
					},
				],
				type: "SIGN_UPS",
			});

			assert(event.ok);

			/**
			 * Act.
			 *
			 * 1. Sign up the user for the event.
			 */
			const actual = await eventService.signUp(
				makeMockContext(),
				user.id,
				event.data.event.id,
			);

			/**
			 * Assert.
			 *
			 * 1. User should be signed up for the event with status CONFIRMED
			 */
			expect(actual.participationStatus).toEqual(
				ParticipationStatus.ON_WAITLIST,
			);
			expect(actual.userId).toEqual(user.id);
			expect(actual.eventId).toEqual(event.data.event.id);
			expect(actual.slotId).toBeNull();
		});

		describe("should add the user to wait list when", () => {
			interface TestCase {
				eventCapacity: number;
				slotCapacity: number;
			}
			const testCases: TestCase[] = [
				{
					eventCapacity: 0,
					slotCapacity: 1,
				},
				{
					eventCapacity: 1,
					slotCapacity: 0,
				},
				{
					eventCapacity: 0,
					slotCapacity: 0,
				},
			];
			test.each(testCases)(
				"event capacity: $eventCapacity, slot capacity: $slotCapacity",
				async ({ eventCapacity, slotCapacity }) => {
					/**
					 * Arrange.
					 *
					 * 1. Create an organization to host the event.
					 * 2. Create an event with capacity.
					 * 3. Create a slot for the event with capacity.
					 * 4. Create a user to sign up for the event.
					 */
					const { organization, user } =
						await makeUserWithOrganizationMembership();
					const event = await eventService.create(makeMockContext(user), {
						type: "SIGN_UPS",
						event: {
							organizationId: organization.id,
							name: faker.color.human(),
							description: faker.lorem.paragraph(),
							startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
							endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
							signUpsEnabled: true,
							capacity: eventCapacity,
							signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
							signUpsEndAt: DateTime.now()
								.plus({ days: 1, hours: 2 })
								.toJSDate(),
						},
						slots: [
							{
								capacity: slotCapacity,
							},
						],
					});

					if (!event.ok) throw event.error;

					/**
					 * Act.
					 *
					 * 1. Sign up the user for the event.
					 */
					const actual = await eventService.signUp(
						makeMockContext(),
						user.id,
						event.data.event.id,
					);

					/**
					 * Assert.
					 *
					 * 1. User should be signed up for the event with status CONFIRMED
					 */
					expect(actual.participationStatus).toEqual(
						ParticipationStatus.ON_WAITLIST,
					);
					expect(actual.userId).toEqual(user.id);
					expect(actual.eventId).toEqual(event.data.event.id);
					expect(actual.slotId).toBeNull();
				},
			);
		});

		it("should handle multiple concurrent sign ups", async () => {
			/**
			 * Arrange.
			 *
			 * 1. Create a user to create events.
			 * 2. Create an organization to host the event.
			 * 3. Create a membership for the user in the organization
			 * 4. Create an event with capacity.
			 * 5. Create a slot for the event with capacity.
			 * 6. Create a user to sign up for the event.
			 */
			const concurrentUsers = 500;
			const { user, organization } = await makeUserWithOrganizationMembership();

			const event = await eventService.create(makeMockContext(user), {
				event: {
					organizationId: organization.id,
					name: faker.color.human(),
					description: faker.lorem.paragraph(),
					startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
					signUpsEnabled: true,
					capacity: concurrentUsers,
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					signUpsEndAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
				},
				slots: [
					{
						capacity: concurrentUsers,
					},
				],
				type: "SIGN_UPS",
			});

			assert(event.ok);

			await prisma.user.createMany({
				data: Array(concurrentUsers)
					.fill(null)
					.map(() => getCreateUserData()),
				skipDuplicates: true,
			});

			const users = await prisma.user.findMany({ take: concurrentUsers });

			/**
			 * Act.
			 *
			 * Sign up all users for the event.
			 */
			const promises = users.map((user) =>
				eventService.signUp(makeMockContext(), user.id, event.data.event.id),
			);
			const actual = await Promise.all(promises);

			/**
			 * Assert.
			 *
			 * All users should be signed up for the event with status CONFIRMED.
			 * The event should have 0 remaining capacity left.
			 * The slot should have 0 remaining capacity left.
			 */
			expect(actual.length).toEqual(concurrentUsers);
			expect(
				actual.every(
					(signUp) =>
						signUp.participationStatus === ParticipationStatus.CONFIRMED,
				),
			).toBe(true);

			const updatedEvent = await prisma.event.findUniqueOrThrow({
				where: { id: event.data.event.id },
			});
			expect(updatedEvent.remainingCapacity).toEqual(0);

			const updatedSlot = await prisma.eventSlot.findFirstOrThrow({
				where: { eventId: event.data.event.id },
			});
			expect(updatedSlot.remainingCapacity).toEqual(0);
		});

		it("should not overfill the event", async () => {
			/**
			 * Arrange.
			 *
			 * 1. Create an organization to host the event.
			 * 2. Create an event with capacity.
			 * 3. Create a slot for the event with capacity.
			 * 4. Create a user to sign up for the event.
			 */
			const concurrentUsers = 500;
			const capacity = 50;
			const { user, organization } = await makeUserWithOrganizationMembership();

			const event = await eventService.create(makeMockContext(user), {
				event: {
					organizationId: organization.id,
					name: faker.color.human(),
					description: faker.lorem.paragraph(),
					startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
					signUpsEnabled: true,
					capacity,
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					signUpsEndAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
				},
				slots: [
					{
						capacity,
					},
				],
				type: "SIGN_UPS",
			});
			assert(event.ok);

			await prisma.user.createMany({
				data: Array(concurrentUsers)
					.fill(null)
					.map(() => getCreateUserData()),
				skipDuplicates: true,
			});

			const users = await prisma.user.findMany({ take: concurrentUsers });

			/**
			 * Act.
			 *
			 * Sign up all users for the event.
			 */
			const promises = users.map((user) =>
				eventService.signUp(makeMockContext(), user.id, event.data.event.id),
			);
			const actual = await Promise.all(promises);

			/**
			 * Assert.
			 *
			 * All users should be signed up for the event with status CONFIRMED.
			 * The event should have 0 remaining capacity.
			 * The slot should have 0 remaining capacity.
			 */
			expect(actual.length).toEqual(concurrentUsers);
			expect(
				actual.filter(
					(signUp) =>
						signUp.participationStatus === ParticipationStatus.CONFIRMED,
				).length,
			).toEqual(capacity);
			expect(
				actual.filter(
					(signUp) =>
						signUp.participationStatus === ParticipationStatus.ON_WAITLIST,
				).length,
			).toEqual(concurrentUsers - capacity);

			const updatedEvent = await prisma.event.findUniqueOrThrow({
				where: { id: event.data.event.id },
			});
			expect(updatedEvent.remainingCapacity).toEqual(0);

			const updatedSlot = await prisma.eventSlot.findFirstOrThrow({
				where: { eventId: event.data.event.id },
			});
			expect(updatedSlot.remainingCapacity).toEqual(0);
		});

		it("should throw InvalidArgumentError if sign ups are disabled for the event", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create an organization to host the event.
			 * 2. Create an event with sign ups disabled.
			 * 3. Create a user to sign up for the event.
			 */
			const { organization, user } = await makeUserWithOrganizationMembership();
			const event = await eventService.create(makeMockContext(user), {
				event: {
					organizationId: organization.id,
					name: faker.word.adjective(),
					startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					signUpsEnabled: false,
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					capacity: 1,
				},
				slots: [
					{
						capacity: 1,
					},
				],
				type: "SIGN_UPS",
			});
			assert(event.ok);

			/**
			 * Act
			 *
			 * Sign up for the event with sign ups disabled.
			 */
			const signUp = eventService.signUp(
				makeMockContext(),
				user.id,
				event.data.event.id,
			);

			/**
			 * Assert
			 *
			 * InvalidArgumentError should be thrown.
			 */
			await expect(signUp).rejects.toThrow(InvalidArgumentError);
		});

		it("should throw InvalidArgumentError if sign ups have not opened", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create an organization to host the event.
			 * 2. Create an event with sign ups disabled.
			 * 3. Create a user to sign up for the event.
			 */
			const { organization, user } = await makeUserWithOrganizationMembership();
			const event = await eventService.create(makeMockContext(user), {
				event: {
					organizationId: organization.id,
					name: faker.word.adjective(),
					startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					signUpsEnabled: true,
					signUpsStartAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					signUpsEndAt: DateTime.now().plus({ days: 2 }).toJSDate(),
					capacity: 1,
				},
				slots: [
					{
						capacity: 1,
					},
				],
				type: "SIGN_UPS",
			});
			assert(event.ok);

			/**
			 * Act
			 *
			 * Sign up for the event with sign ups disabled.
			 */
			const signUp = eventService.signUp(
				makeMockContext(),
				user.id,
				event.data.event.id,
			);

			/**
			 * Assert
			 *
			 * InvalidArgumentError should be thrown.
			 */
			await expect(signUp).rejects.toThrow(InvalidArgumentError);
		});
	});
});

function getCreateUserData() {
	return {
		firstName: faker.person.firstName(),
		lastName: faker.person.lastName(),
		username: faker.string.sample(30),
		feideId: faker.string.sample(30),
		email: faker.internet.exampleEmail({ firstName: faker.string.uuid() }),
	};
}

async function makeUserWithOrganizationMembership(
	userData: Partial<User> = {},
): Promise<{ user: User; organization: Organization }> {
	const user = newUserFromDSO(
		await prisma.user.create({
			data: {
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				username: faker.string.sample(30),
				feideId: faker.string.uuid(),
				email: faker.internet.exampleEmail({ firstName: faker.string.uuid() }),
				...userData,
			},
		}),
	);
	const organization = await prisma.organization.create({
		data: {
			name: faker.string.sample(20),
		},
	});
	await prisma.member.create({
		data: {
			organizationId: organization.id,
			userId: user.id,
			role: "MEMBER",
		},
	});
	return { user, organization };
}

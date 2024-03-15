import assert from "node:assert";
import { faker } from "@faker-js/faker";
import { DateTime } from "luxon";
import { InvalidArgumentError } from "~/domain/errors.js";
import { EventParticipationStatus } from "~/domain/events/sign-ups.js";
import type { Organization } from "~/domain/organizations.js";
import { User } from "~/domain/users.js";
import { makeMockContext } from "~/lib/context.js";
import prisma from "~/lib/prisma.js";
import type { EventService } from "../../service.js";
import { makeServices } from "./dependencies-factory.js";

describe("Event Sign Up", () => {
	let eventService: EventService;

	beforeAll(() => {
		({ eventService } = makeServices());
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
			const ctx = makeMockContext(user);
			const createEventResult = await eventService.create(ctx, {
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
			});

			assert(createEventResult.ok);
			/**
			 * Act.
			 *
			 * 1. Sign up the user for the event.
			 */
			const actual = await eventService.signUp(ctx, {
				userId: user.id,
				eventId: createEventResult.data.event.id,
			});
			if (!actual.ok) throw actual.error;

			/**
			 * Assert.
			 *
			 * 1. User should be signed up for the event with status CONFIRMED
			 */
			expect(actual.data.signUp.participationStatus).toEqual(
				EventParticipationStatus.CONFIRMED,
			);
			expect(actual.data.signUp.userId).toEqual(user.id);
			expect(actual.data.signUp.eventId).toEqual(
				createEventResult.data.event.id,
			);
			expect(actual.data.signUp.slotId).not.toBeNull();
		});

		it("should add user provided information to the sign up", async () => {
			/**
			 * Arrange.
			 *
			 * 1. Create an organization to host the event.
			 * 2. Create an event with capacity.
			 * 3. Create a slot for the event with capacity.
			 * 4. Create a user to sign up for the event.
			 */
			const { organization, user } = await makeUserWithOrganizationMembership();
			const ctx = makeMockContext(user);
			const createEventResult = await eventService.create(ctx, {
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
					signUpsRequireUserProvidedInformation: true,
				},
				slots: [
					{
						capacity: 1,
					},
				],
				type: "SIGN_UPS",
			});

			if (!createEventResult.ok) throw createEventResult.error;
			/**
			 * Act.
			 *
			 * 1. Sign up the user for the event.
			 */
			const userProvidedInformation = faker.lorem.paragraph();
			const actual = await eventService.signUp(ctx, {
				userId: user.id,
				eventId: createEventResult.data.event.id,
				userProvidedInformation,
			});
			if (!actual.ok) throw actual.error;

			/**
			 * Assert.
			 *
			 * 1. User should be signed up for the event with status CONFIRMED
			 */
			expect(actual.data.signUp.participationStatus).toEqual(
				EventParticipationStatus.CONFIRMED,
			);
			expect(actual.data.signUp.userId).toEqual(user.id);
			expect(actual.data.signUp.eventId).toEqual(
				createEventResult.data.event.id,
			);
			expect(actual.data.signUp.slotId).not.toBeNull();
			expect(actual.data.signUp.userProvidedInformation).toEqual(
				userProvidedInformation,
			);
		});

		it("should create an order for the event's product for a ticket event for a confirmed sign up", async () => {
			/**
			 * Arrange.
			 *
			 * 1. Create an organization to host the event.
			 * 2. Create an event with capacity.
			 * 3. Create a slot for the event with capacity.
			 * 4. Create a user to sign up for the event.
			 */
			const { productService } = makeServices();
			const { organization, user } = await makeUserWithOrganizationMembership({
				isSuperUser: true,
			});
			const ctx = makeMockContext(user);
			const createMerchantResult = await productService.merchants.create(ctx, {
				clientId: faker.string.uuid(),
				clientSecret: faker.string.uuid(),
				name: faker.string.uuid(),
				serialNumber: faker.string.uuid(),
				subscriptionKey: faker.string.uuid(),
			});
			if (!createMerchantResult.ok) throw createMerchantResult.error;
			const createEventResult = await eventService.create(ctx, {
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
				tickets: {
					price: 100 * 300,
					merchantId: createMerchantResult.data.merchant.id,
				},
				type: "TICKETS",
			});

			assert(createEventResult.ok);
			/**
			 * Act.
			 *
			 * 1. Sign up the user for the event.
			 */
			const actual = await eventService.signUp(ctx, {
				userId: user.id,
				eventId: createEventResult.data.event.id,
			});
			if (!actual.ok) throw actual.error;

			/**
			 * Assert.
			 *
			 * 1. User should be signed up for the event with status CONFIRMED
			 * 2. There should be an order created for the user
			 */
			expect(actual.data.signUp.participationStatus).toEqual(
				EventParticipationStatus.CONFIRMED,
			);
			assert(
				actual.data.signUp.orderId !== undefined &&
					actual.data.signUp.orderId !== null,
			);
			const getOrder = await productService.orders.get(ctx, {
				id: actual.data.signUp.orderId,
			});

			if (!getOrder.ok) throw getOrder.error;
			const { order } = getOrder.data;
			expect(order.userId).toEqual(user.id);
			expect(order.attempt).toEqual(0);
			expect(order.paymentStatus).toEqual("PENDING");
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
			const ctx = makeMockContext(user);
			const createEventResult = await eventService.create(ctx, {
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
			});
			assert(createEventResult.ok);

			/**
			 * Act.
			 *
			 * 1. Sign up the user for the event.
			 */
			const actual = await eventService.signUp(ctx, {
				userId: user.id,
				eventId: createEventResult.data.event.id,
			});
			if (!actual.ok) throw actual.error;

			/**
			 * Assert.
			 *
			 * 1. User should be signed up for the event with status CONFIRMED
			 */
			expect(actual.data.signUp.participationStatus).toEqual(
				EventParticipationStatus.CONFIRMED,
			);
			expect(actual.data.signUp.userId).toEqual(user.id);
			expect(actual.data.signUp.eventId).toEqual(
				createEventResult.data.event.id,
			);
			expect(actual.data.signUp.slotId).not.toBeNull();
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
			const ctx = makeMockContext(user);
			const event = await eventService.create(ctx, {
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
			const actual = await eventService.signUp(ctx, {
				userId: user.id,
				eventId: event.data.event.id,
			});
			if (!actual.ok) throw actual.error;

			/**
			 * Assert.
			 *
			 * 1. User should be signed up for the event with status CONFIRMED
			 */
			expect(actual.data.signUp.participationStatus).toEqual(
				EventParticipationStatus.ON_WAITLIST,
			);
			expect(actual.data.signUp.userId).toEqual(user.id);
			expect(actual.data.signUp.eventId).toEqual(event.data.event.id);
			expect(actual.data.signUp.slotId).toBeNull();
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
					const ctx = makeMockContext(user);
					const event = await eventService.create(ctx, {
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
					const actual = await eventService.signUp(ctx, {
						userId: user.id,
						eventId: event.data.event.id,
					});
					if (!actual.ok) throw actual.error;

					/**
					 * Assert.
					 *
					 * 1. User should be signed up for the event with status CONFIRMED
					 */
					expect(actual.data.signUp.participationStatus).toEqual(
						EventParticipationStatus.ON_WAITLIST,
					);
					expect(actual.data.signUp.userId).toEqual(user.id);
					expect(actual.data.signUp.eventId).toEqual(event.data.event.id);
					expect(actual.data.signUp.slotId).toBeNull();
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
				eventService.signUp(makeMockContext({ ...user, canUpdateYear: true }), {
					userId: user.id,
					eventId: event.data.event.id,
				}),
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
				actual.every((result) => {
					if (!result.ok) throw result.error;
					return (
						result.data.signUp.participationStatus ===
						EventParticipationStatus.CONFIRMED
					);
				}),
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
			const ctx = makeMockContext(user);
			const event = await eventService.create(ctx, {
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
				eventService.signUp(makeMockContext({ ...user, canUpdateYear: true }), {
					userId: user.id,
					eventId: event.data.event.id,
				}),
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
				actual.filter((result) => {
					if (!result.ok) throw result.error;
					return (
						result.data.signUp.participationStatus ===
						EventParticipationStatus.CONFIRMED
					);
				}).length,
			).toEqual(capacity);
			expect(
				actual.filter((result) => {
					if (!result.ok) throw result.error;
					return (
						result.data.signUp.participationStatus ===
						EventParticipationStatus.ON_WAITLIST
					);
				}).length,
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

		it("should return InvalidArgumentError if sign ups are disabled for the event", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create an organization to host the event.
			 * 2. Create an event with sign ups disabled.
			 * 3. Create a user to sign up for the event.
			 */
			const { organization, user } = await makeUserWithOrganizationMembership();
			const ctx = makeMockContext(user);
			const event = await eventService.create(ctx, {
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
			const signUpResult = await eventService.signUp(ctx, {
				userId: user.id,
				eventId: event.data.event.id,
			});

			/**
			 * Assert
			 *
			 * InvalidArgumentError should be returned.
			 */
			expect(signUpResult).toEqual({
				ok: false,
				error: expect.any(InvalidArgumentError),
			});
		});

		it("should return InvalidArgumentError if sign ups have not opened", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create an organization to host the event.
			 * 2. Create an event with sign ups disabled.
			 * 3. Create a user to sign up for the event.
			 */
			const { organization, user } = await makeUserWithOrganizationMembership();
			const ctx = makeMockContext(user);
			const event = await eventService.create(ctx, {
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
			if (!event.ok) throw event.error;

			/**
			 * Act
			 *
			 * Sign up for the event with sign ups disabled.
			 */
			const signUpResult = await eventService.signUp(ctx, {
				userId: user.id,
				eventId: event.data.event.id,
			});

			/**
			 * Assert
			 *
			 * InvalidArgumentError should be returned.
			 */
			expect(signUpResult).toEqual({
				ok: false,
				error: expect.any(InvalidArgumentError),
			});
		});

		it("should return InvalidArgumentError if user provided information is required, but not provided", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create an organization to host the event.
			 * 2. Create an event with sign ups disabled.
			 * 3. Create a user to sign up for the event.
			 */
			const { organization, user } = await makeUserWithOrganizationMembership();
			const ctx = makeMockContext(user);
			const event = await eventService.create(ctx, {
				event: {
					organizationId: organization.id,
					name: faker.word.adjective(),
					startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					signUpsEnabled: true,
					signUpsStartAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					signUpsEndAt: DateTime.now().plus({ days: 2 }).toJSDate(),
					capacity: 1,
					signUpsRequireUserProvidedInformation: true,
				},
				slots: [
					{
						capacity: 1,
					},
				],
				type: "SIGN_UPS",
			});
			if (!event.ok) throw event.error;

			/**
			 * Act
			 *
			 * Sign up for the event without user provided information
			 */
			const signUpResult = await eventService.signUp(ctx, {
				userId: user.id,
				eventId: event.data.event.id,
			});

			/**
			 * Assert
			 *
			 * InvalidArgumentError should be returned.
			 */
			expect(signUpResult).toEqual({
				ok: false,
				error: expect.any(InvalidArgumentError),
			});
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
	const user = new User(
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

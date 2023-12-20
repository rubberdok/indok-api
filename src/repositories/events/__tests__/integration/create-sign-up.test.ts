import { faker } from "@faker-js/faker";
import { ParticipationStatus } from "@prisma/client";
import { DateTime } from "luxon";
import { ErrorCode, errorCodes } from "~/domain/errors.js";
import { AlreadySignedUpError } from "~/domain/events.js";
import prisma from "~/lib/prisma.js";
import { EventRepository } from "../../repository.js";

describe("EventRepository", () => {
	let eventRepository: EventRepository;
	beforeAll(() => {
		eventRepository = new EventRepository(prisma);
	});

	describe("createSignUp", () => {
		it("should raise AlreadySignedUpError if the user already has an active sign up", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create an event with capacity
			 * 2. Create a slot with capacity
			 * 3. Create a user to sign up for the event
			 * 4. Sign up the user to the event and slot with active: true and participationStatus: CONFIRMED
			 */
			const event = await makeEvent({ capacity: 1 });
			const slot = await makeSlot({ eventId: event.id, capacity: 1 });
			const user = await makeUser();
			await makeSignUp({
				userId: user.id,
				eventId: event.id,
				slotId: slot.id,
				participationStatus: ParticipationStatus.CONFIRMED,
				active: true,
			});

			/**
			 * Act
			 *
			 * Call createSignUp2 with the same user and event
			 */
			const actual = eventRepository.createSignUp({
				userId: user.id,
				eventId: event.id,
				participationStatus: ParticipationStatus.CONFIRMED,
				slotId: slot.id,
			});

			/**
			 * Assert
			 *
			 * Should throw an error that the unique constraint is violated
			 */
			await expect(actual).rejects.toThrow(AlreadySignedUpError);
			const updatedEvent = await prisma.event.findUnique({
				where: { id: event.id },
			});
			const updatedSlot = await prisma.eventSlot.findUnique({
				where: { id: slot.id },
			});
			expect(updatedEvent?.remainingCapacity).toBe(event.remainingCapacity);
			expect(updatedSlot?.remainingCapacity).toBe(slot.remainingCapacity);
		});

		it("should create a sign up with `active: true` and decrement capacities", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create an event with capacity
			 * 2. Create a slot with capacity
			 * 3. Create a user to sign up for the event
			 */
			const event = await makeEvent({ capacity: 1 });
			const slot = await makeSlot({ eventId: event.id, capacity: 1 });
			const user = await makeUser();

			/**
			 * Act
			 *
			 * Call createSignUp2 with the user, event, and slot
			 */
			const actual = await eventRepository.createSignUp({
				userId: user.id,
				eventId: event.id,
				participationStatus: ParticipationStatus.CONFIRMED,
				slotId: slot.id,
			});

			/**
			 * Assert
			 *
			 * Should return the sign up with `active: true`
			 */
			expect(actual.signUp.active).toBe(true);
			expect(actual.slot.remainingCapacity).toBe(slot.remainingCapacity - 1);
			expect(actual.event.signUpDetails?.remainingCapacity).toBe(
				(event.remainingCapacity ?? NaN) - 1,
			);
			expect(actual.slot.version).toBe(slot.version + 1);
			expect(actual.event.version).toBe(event.version + 1);
		});

		it("should not decrement remaining capacities if participation status is ON_WAITLIST", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create an event with capacity
			 * 2. Create a slot with capacity
			 * 3. Create a user to sign up for the event
			 */
			const event = await makeEvent({ capacity: 1 });
			await makeSlot({ eventId: event.id, capacity: 1 });
			const user = await makeUser();

			/**
			 * Act
			 *
			 * Call createSignUp2 with the user and event, with participation status ON_WAITLIST
			 */
			const actual = await eventRepository.createSignUp({
				userId: user.id,
				eventId: event.id,
				participationStatus: ParticipationStatus.ON_WAITLIST,
			});

			/**
			 * Assert
			 *
			 * Should return the sign up with `active: true`
			 */
			expect(actual.signUp.active).toBe(true);
			expect(actual.event.signUpDetails?.remainingCapacity).toBe(
				event.remainingCapacity,
			);
			expect(actual.event.version).toBe(event.version + 1);
		});

		it("create a sign up if a sign up with `active: false` already exists", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create an event with capacity
			 * 2. Create a slot with capacity
			 * 3. Create a user to sign up for the event
			 */
			const event = await makeEvent({ capacity: 1 });
			const slot = await makeSlot({ eventId: event.id, capacity: 1 });
			const user = await makeUser();
			const existingSignUp = await makeSignUp({
				eventId: event.id,
				userId: user.id,
				active: false,
				participationStatus: ParticipationStatus.REMOVED,
			});

			/**
			 * Act
			 *
			 * Call createSignUp2 with the user and event, with participation status ON_WAITLIST
			 */
			const actual = await eventRepository.createSignUp({
				userId: user.id,
				eventId: event.id,
				slotId: slot.id,
				participationStatus: ParticipationStatus.CONFIRMED,
			});

			/**
			 * Assert
			 *
			 * Should return the sign up with `active: true`
			 */
			expect(actual.signUp.active).toBe(true);
			expect(actual.signUp.id).not.toBe(existingSignUp.id);
			expect(actual.event.signUpDetails?.remainingCapacity).toBe(
				(event.remainingCapacity ?? NaN) - 1,
			);
			expect(actual.event.version).toBe(event.version + 1);
		});

		it("create a sign up with status ON_WAITLIST even if the event is full", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create an event with capacity
			 * 2. Create a slot with capacity
			 * 3. Create a user to sign up for the event
			 */
			const event = await makeEvent({ capacity: 0 });
			await makeSlot({ eventId: event.id, capacity: 0 });
			const user = await makeUser();

			/**
			 * Act
			 *
			 * Call createSignUp2 with the user and event, with participation status ON_WAITLIST
			 */
			const actual = await eventRepository.createSignUp({
				userId: user.id,
				eventId: event.id,
				participationStatus: ParticipationStatus.ON_WAITLIST,
			});

			/**
			 * Assert
			 *
			 * Should return the sign up with `active: true`
			 */
			expect(actual.signUp.active).toBe(true);
			expect(actual.event.signUpDetails?.remainingCapacity).toBe(
				event.remainingCapacity,
			);
		});

		describe("should raise", () => {
			interface TestCase {
				name: string;
				arrange: {
					eventCapacity: number;
					slotCapacity: number;
				};
				assertion: {
					errorCode: ErrorCode;
				};
			}
			const testCases: TestCase[] = [
				{
					name: "if the event is full",
					arrange: {
						eventCapacity: 0,
						slotCapacity: 1,
					},
					assertion: {
						errorCode: errorCodes.ERR_NOT_FOUND,
					},
				},
				{
					name: "if the slot is full",
					arrange: {
						eventCapacity: 1,
						slotCapacity: 0,
					},
					assertion: {
						errorCode: errorCodes.ERR_NOT_FOUND,
					},
				},
			];

			test.each(testCases)(
				"$assertion.errorCode $name",
				async ({ assertion, arrange }) => {
					/**
					 * Arrange
					 *
					 * 1. Create a user
					 * 2. Create an event with remainingCapacity from test case
					 * 3. Create a slot with remainingCapacity from test case
					 */
					const user = await makeUser();
					const event = await makeEvent({ capacity: arrange.eventCapacity });
					const slot = await makeSlot({
						eventId: event.id,
						capacity: arrange.slotCapacity,
					});

					/**
					 * Act
					 *
					 * Call makeConfirmedSignUp where the sign up version is from test case
					 */
					const actual = eventRepository.createSignUp({
						userId: user.id,
						participationStatus: ParticipationStatus.CONFIRMED,
						slotId: slot.id,
						eventId: event.id,
					});

					/**
					 * Assert
					 *
					 * The error code should match the expected error code
					 */
					await expect(actual).rejects.toHaveProperty(
						"code",
						assertion.errorCode,
					);
				},
			);
		});
	});
});

function makeUser() {
	return prisma.user.create({
		data: {
			email: faker.internet.email(),
			firstName: faker.person.firstName(),
			lastName: faker.person.lastName(),
			username: faker.string.sample(20),
			feideId: faker.string.uuid(),
		},
	});
}

function makeEvent(data: { capacity: number }) {
	return prisma.event.create({
		data: {
			name: faker.word.adjective(),
			startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
			endAt: DateTime.now().plus({ days: 2 }).toJSDate(),
			remainingCapacity: data.capacity,
			capacity: data.capacity,
			signUpsEnabled: true,
			signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
			signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
		},
	});
}

function makeSlot(data: { eventId: string; capacity: number }) {
	const { eventId, capacity } = data;
	return prisma.eventSlot.create({
		data: {
			eventId,
			remainingCapacity: capacity,
		},
	});
}

function makeSignUp(data: {
	eventId: string;
	userId: string;
	slotId?: string;
	participationStatus: ParticipationStatus;
	active?: boolean;
}) {
	const { eventId, slotId, userId, participationStatus, active } = data;
	return prisma.eventSignUp.create({
		data: {
			eventId,
			slotId,
			userId,
			participationStatus,
			active,
		},
	});
}

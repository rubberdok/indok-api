import { faker } from "@faker-js/faker";
import { ParticipationStatus } from "@prisma/client";
import { DateTime } from "luxon";
import { InvalidArgumentError, NotFoundError } from "~/domain/errors.js";
import prisma from "~/lib/prisma.js";
import { EventRepository } from "../../repository.js";

describe("EventRepository", () => {
	let eventRepository: EventRepository;

	beforeAll(() => {
		eventRepository = new EventRepository(prisma);
	});

	describe("updateSignUp", () => {
		describe("newParticipationStatus: CONFIRMED", () => {
			it("should update the status for a wait list sign up, decrementing the event and slot capacities", async () => {
				/**
				 * Arrange
				 *
				 * 1. Create a user
				 * 2. Create an event with capacity
				 * 3. Create a slot with capacity
				 * 4. Create a sign up for the event with status ON_WAITLIST
				 */
				const user = await makeUser();
				const event = await makeEvent({ capacity: 1 });
				const slot = await makeSlot({ eventId: event.id, capacity: 1 });
				const signUp = await makeSignUp({
					userId: user.id,
					eventId: event.id,
					participationStatus: ParticipationStatus.ON_WAITLIST,
				});

				/**
				 * Act
				 *
				 * 1. Call updateSignUp and change the participation status to CONFIRMED
				 */
				const actual = await eventRepository.updateSignUp({
					eventId: event.id,
					userId: user.id,
					slotId: slot.id,
					newParticipationStatus: ParticipationStatus.CONFIRMED,
				});

				/**
				 * Assert
				 *
				 * The participation status should be CONFIRMED
				 * The EventSignUp version should be incremented
				 * The Event remainingCapacity should be decremented
				 * The EventSlot remainingCapacity should be decremented
				 * The EventSignUp should be returned
				 */
				expect(actual.signUp.participationStatus).toBe(
					ParticipationStatus.CONFIRMED,
				);
				expect(actual.signUp.version).toBe(signUp.version + 1);
				expect(actual.event.signUpDetails?.remainingCapacity).toBe(0);
				expect(actual.slot?.remainingCapacity).toBe(0);
			});

			it("should not make any changes if the sign up is already confirmed", async () => {
				/**
				 * Arrange
				 *
				 * 1. Create a user
				 * 2. Create an event with capacity
				 * 3. Create a slot with capacity
				 * 4. Create a sign up for the event with status CONFIRMED
				 */
				const user = await makeUser();
				const event = await makeEvent({ capacity: 1 });
				const slot = await makeSlot({ eventId: event.id, capacity: 1 });
				const signUp = await makeSignUp({
					userId: user.id,
					eventId: event.id,
					slotId: slot.id,
					participationStatus: ParticipationStatus.CONFIRMED,
				});

				/**
				 * Act
				 *
				 * 1. Call updateSignUp and change the participation status to CONFIRMED
				 */
				const actual = await eventRepository.updateSignUp({
					eventId: event.id,
					userId: user.id,
					slotId: slot.id,
					newParticipationStatus: ParticipationStatus.CONFIRMED,
				});

				/**
				 * Assert
				 *
				 * The sign up version should remain unchanged
				 * The event remainingCapacity should remain unchanged
				 * The slot remainingCapacity should remain unchanged
				 */
				expect(actual.signUp.version).toBe(signUp.version);
				expect(actual.event.signUpDetails?.remainingCapacity).toBe(
					event.remainingCapacity,
				);
				expect(actual.slot?.remainingCapacity).toBe(slot.remainingCapacity);
			});

			it("should raise InvalidArgumentError if the sign up is already `active: false`", async () => {
				/**
				 * Arrange
				 *
				 * 1. Create a user
				 * 2. Create an event with capacity
				 * 3. Create a slot with capacity
				 * 4. Create a sign up for the event with status REMOVED and active: false
				 */
				const user = await makeUser();
				const event = await makeEvent({ capacity: 1 });
				const slot = await makeSlot({ eventId: event.id, capacity: 1 });
				await makeSignUp({
					userId: user.id,
					eventId: event.id,
					participationStatus: ParticipationStatus.REMOVED,
					active: false,
				});

				/**
				 * Act
				 *
				 * 1. Call updateSignUp and change the participation status to CONFIRMED
				 */
				const actual = eventRepository.updateSignUp({
					eventId: event.id,
					userId: user.id,
					slotId: slot.id,
					newParticipationStatus: ParticipationStatus.CONFIRMED,
				});

				/**
				 * Assert
				 *
				 * InvalidArugmentError should be raised
				 */
				await expect(actual).rejects.toThrow(InvalidArgumentError);
			});

			it("should raise NotFoundError if the event is full and existing sign up is ON_WAITLIST", async () => {
				/**
				 * Arrange
				 *
				 * 1. Create a user
				 * 2. Create an event with capacity 0
				 * 3. Create a slot with capacity
				 * 4. Create a sign up for the event with status REMOVED and active: false
				 */
				const user = await makeUser();
				const event = await makeEvent({ capacity: 0 });
				const slot = await makeSlot({ eventId: event.id, capacity: 1 });
				await makeSignUp({
					userId: user.id,
					eventId: event.id,
					participationStatus: ParticipationStatus.ON_WAITLIST,
				});

				/**
				 * Act
				 *
				 * 1. Call updateSignUp and change the participation status to CONFIRMED
				 */
				const actual = eventRepository.updateSignUp({
					eventId: event.id,
					userId: user.id,
					slotId: slot.id,
					newParticipationStatus: ParticipationStatus.CONFIRMED,
				});

				/**
				 * Assert
				 *
				 * InvalidArugmentError should be raised
				 */
				await expect(actual).rejects.toThrow(NotFoundError);
			});

			it("should raise NotFoundError if the slot is full and existing sign up is ON_WAITLIST", async () => {
				/**
				 * Arrange
				 *
				 * 1. Create a user
				 * 2. Create an event with capacity
				 * 3. Create a slot with capacity 0
				 * 4. Create a sign up for the event with status REMOVED and active: false
				 */
				const user = await makeUser();
				const event = await makeEvent({ capacity: 1 });
				const slot = await makeSlot({ eventId: event.id, capacity: 0 });
				await makeSignUp({
					userId: user.id,
					eventId: event.id,
					participationStatus: ParticipationStatus.ON_WAITLIST,
				});

				/**
				 * Act
				 *
				 * 1. Call updateSignUp and change the participation status to CONFIRMED
				 */
				const actual = eventRepository.updateSignUp({
					eventId: event.id,
					userId: user.id,
					slotId: slot.id,
					newParticipationStatus: ParticipationStatus.CONFIRMED,
				});

				/**
				 * Assert
				 *
				 * InvalidArugmentError should be raised
				 */
				await expect(actual).rejects.toThrow(NotFoundError);
			});
		});

		describe("newParticipationStatus: REMOVED or RETRACTED", () => {
			it("should update the status for a confirmed sign up, incrementing the event and slot capacities", async () => {
				/**
				 * Arrange
				 *
				 * 1. Create a user
				 * 2. Create an event
				 * 3. Create a slot
				 * 4. Create a sign up for the event with status CONFIRMED
				 */
				const user = await makeUser();
				const event = await makeEvent({ capacity: 0 });
				const slot = await makeSlot({ eventId: event.id, capacity: 0 });
				const signUp = await makeSignUp({
					userId: user.id,
					eventId: event.id,
					slotId: slot.id,
					participationStatus: ParticipationStatus.CONFIRMED,
				});

				/**
				 * Act
				 *
				 * 1. Call updateSignUp and change the participation status to REMOVED
				 */
				const actual = await eventRepository.updateSignUp({
					eventId: event.id,
					userId: user.id,
					newParticipationStatus: ParticipationStatus.REMOVED,
				});

				/**
				 * Assert
				 *
				 * The participation status should be REMOVED
				 * The EventSignUp version should be incremented
				 * The Event remainingCapacity should be incremented
				 * The EventSlot remainingCapacity should be incremented
				 */
				expect(actual.signUp.participationStatus).toBe(
					ParticipationStatus.REMOVED,
				);
				expect(actual.signUp.version).toBe(signUp.version + 1);
				expect(actual.event.signUpDetails?.remainingCapacity).toBe(
					(event.remainingCapacity ?? Number.NaN) + 1,
				);
				const updatedSlot = await prisma.eventSlot.findUnique({
					where: { id: slot.id },
				});
				expect(updatedSlot?.remainingCapacity).toBe(slot.remainingCapacity + 1);
			});

			it("should update the status for a ON_WAITLIST sign up without changing capacities", async () => {
				/**
				 * Arrange
				 *
				 * 1. Create a user
				 * 2. Create an event
				 * 3. Create a slot
				 * 4. Create a sign up for the event with status ON_WAITLIST
				 */
				const user = await makeUser();
				const event = await makeEvent({ capacity: 0 });
				const slot = await makeSlot({ eventId: event.id, capacity: 0 });
				const signUp = await makeSignUp({
					userId: user.id,
					eventId: event.id,
					participationStatus: ParticipationStatus.ON_WAITLIST,
				});

				/**
				 * Act
				 *
				 * 1. Call updateSignUp and change the participation status to REMOVED
				 */
				const actual = await eventRepository.updateSignUp({
					eventId: event.id,
					userId: user.id,
					newParticipationStatus: ParticipationStatus.REMOVED,
				});

				/**
				 * Assert
				 *
				 * The participation status should be REMOVED
				 * The EventSignUp version should be incremented
				 * The EventSignUp should have active: false
				 * The Event remainingCapacity should not be incremented
				 * The EventSlot remainingCapacity should not be incremented
				 */
				expect(actual.signUp.participationStatus).toBe(
					ParticipationStatus.REMOVED,
				);
				expect(actual.signUp.active).toBe(false);
				expect(actual.signUp.version).toBe(signUp.version + 1);
				expect(actual.event.signUpDetails?.remainingCapacity).toBe(
					event.remainingCapacity,
				);
				const updatedSlot = await prisma.eventSlot.findUnique({
					where: { id: slot.id },
				});
				expect(updatedSlot?.remainingCapacity).toBe(slot.remainingCapacity);
			});

			it("should replace an existing active: false sign up with the newer sign up", async () => {
				/**
				 * Arrange
				 *
				 * 1. Create a user
				 * 2. Create an event
				 * 3. Create a slot
				 * 4. Create a sign up for the event with status ON_WAITLIST
				 */
				const user = await makeUser();
				const event = await makeEvent({ capacity: 0 });
				await makeSlot({ eventId: event.id, capacity: 0 });
				const existingInactiveSignUp = await makeSignUp({
					userId: user.id,
					eventId: event.id,
					participationStatus: ParticipationStatus.REMOVED,
					active: false,
				});
				const signUp = await makeSignUp({
					userId: user.id,
					eventId: event.id,
					participationStatus: ParticipationStatus.ON_WAITLIST,
				});

				/**
				 * Act
				 *
				 * 1. Call updateSignUp and change the participation status to REMOVED
				 */
				const actual = await eventRepository.updateSignUp({
					eventId: event.id,
					userId: user.id,
					newParticipationStatus: ParticipationStatus.REMOVED,
				});

				/**
				 * Assert
				 *
				 * The participation status should be REMOVED
				 * The EventSignUp version should be incremented
				 * The EventSignUp should have active: false
				 * The previous inactive sign up should be deleted
				 */
				expect(actual.signUp.participationStatus).toBe(
					ParticipationStatus.REMOVED,
				);
				expect(actual.signUp.active).toBe(false);
				expect(actual.signUp.version).toBe(signUp.version + 1);
				const previousSignUp = await prisma.eventSignUp.findUnique({
					where: { id: existingInactiveSignUp.id },
				});
				expect(previousSignUp).toBe(null);
			});

			it("should raise InvalidArugmentError if active: false already", async () => {
				/**
				 * Arrange
				 *
				 * 1. Create a user
				 * 2. Create an event
				 * 3. Create a slot
				 * 4. Create a sign up for the event with status ON_WAITLIST
				 */
				const user = await makeUser();
				const event = await makeEvent({ capacity: 0 });
				await makeSlot({ eventId: event.id, capacity: 0 });
				await makeSignUp({
					userId: user.id,
					eventId: event.id,
					participationStatus: ParticipationStatus.REMOVED,
					active: false,
				});

				/**
				 * Act
				 *
				 * 1. Call updateSignUp and change the participation status to REMOVED
				 */
				const actual = eventRepository.updateSignUp({
					eventId: event.id,
					userId: user.id,
					newParticipationStatus: ParticipationStatus.REMOVED,
				});

				/**
				 * Assert
				 *
				 * InvalidArugmentError should be raised
				 */
				await expect(actual).rejects.toThrow(InvalidArgumentError);
			});
		});
	});
});

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

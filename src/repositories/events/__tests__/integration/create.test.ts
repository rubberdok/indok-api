import assert from "assert";
import { faker } from "@faker-js/faker";
import { DateTime } from "luxon";
import {
	Event,
	type EventType,
	type NewEventParams,
	type NewEventReturnType,
} from "~/domain/events/event.js";
import {
	type NewSlotParams,
	Slot,
	type SlotType,
} from "~/domain/events/slot.js";
import { makeMockContext } from "~/lib/context.js";
import prisma from "~/lib/prisma.js";
import { EventRepository } from "../../repository.js";

describe("EventRepository", () => {
	let eventRepository: EventRepository;

	beforeAll(() => {
		eventRepository = new EventRepository(prisma);
	});

	describe("#create", () => {
		it("with sign ups enabled, should create an event with slots", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create an organization with organizationId {organizationId} to act as the organization that the event belongs to
			 */
			const organization = await prisma.organization.create({
				data: {
					name: faker.string.sample(20),
				},
			});

			/**
			 * Act
			 *
			 * Create an event with sign ups enabled
			 */
			const newEvent = makeNewEvent({
				type: "SIGN_UPS",
				event: {
					name: faker.string.sample(),
					description: faker.lorem.paragraph(),
					startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
					contactEmail: faker.internet.email(),
					organizationId: organization.id,
					location: faker.location.streetAddress(),
					capacity: 10,
					signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					signUpsEnabled: true,
				},
			});
			const newSlots = [makeNewSlot({ capacity: 10 })];
			const actual = await eventRepository.create(makeMockContext(), {
				event: newEvent,
				slots: newSlots,
			});
			if (!actual.ok) throw actual.error;
			const slots = await prisma.eventSlot.findMany({
				where: {
					eventId: actual.data.event.id,
				},
			});
			expect(slots).toHaveLength(1);
			expect(slots[0]?.capacity).toBe(10);
			expect(actual.data.event.signUpsEnabled).toBe(true);
			expect(actual.data.event.capacity).toBe(10);
			expect(actual.data.event.remainingCapacity).toBe(10);
		});

		it("with sign ups disabled, should create an event", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create an organization with organizationId {organizationId} to act as the organization that the event belongs to
			 */
			const organization = await prisma.organization.create({
				data: {
					name: faker.string.sample(20),
				},
			});

			/**
			 * Act
			 *
			 * Create an event without sign ups enabled
			 */
			const newEvent = makeNewEvent({
				type: "BASIC",
				event: {
					name: faker.string.sample(),
					description: faker.lorem.paragraph(),
					startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
					contactEmail: faker.internet.email(),
					organizationId: organization.id,
					location: faker.location.streetAddress(),
				},
			});

			const actual = await eventRepository.create(makeMockContext(), {
				event: newEvent,
			});
			if (!actual.ok) throw actual.error;

			expect(actual.data.slots).toHaveLength(0);
			expect(actual.data.event.signUpsEnabled).toBe(false);
		});

		it("with categories", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create an organization with organizationId {organizationId} to act as the organization that the event belongs to
			 * 2. Create a category
			 */
			const organization = await prisma.organization.create({
				data: {
					name: faker.string.sample(20),
				},
			});
			const category = await prisma.eventCategory.create({
				data: {
					name: faker.string.sample(20),
				},
			});

			/**
			 * Act
			 *
			 * Create an event without sign ups enabled
			 */

			const newEvent = makeNewEvent({
				type: "BASIC",
				event: {
					name: faker.string.sample(),
					description: faker.lorem.paragraph(),
					startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
					contactEmail: faker.internet.email(),
					organizationId: organization.id,
					location: faker.location.streetAddress(),
				},
			});
			const actual = await eventRepository.create(makeMockContext(), {
				event: newEvent,
				categories: [{ id: category.id }],
			});
			assert(actual.ok);

			expect(actual.data.categories).toEqual([
				expect.objectContaining({
					id: category.id,
					name: category.name,
				}),
			]);
		});
	});
});

function makeNewEvent(params: NewEventParams): EventType {
	let newEvent: NewEventReturnType;
	switch (params.type) {
		case "BASIC":
			newEvent = Event.new(params);
			break;
		case "SIGN_UPS":
			newEvent = Event.new(params);
			break;
		case "TICKETS":
			newEvent = Event.new(params);
			break;
	}
	if (!newEvent.ok) {
		throw new Error(newEvent.error.message);
	}
	return newEvent.data.event;
}

function makeNewSlot(params: NewSlotParams): SlotType {
	const newSlot = Slot.new(params);
	if (!newSlot.ok) {
		throw new Error(newSlot.error.message);
	}
	return newSlot.data.slot;
}

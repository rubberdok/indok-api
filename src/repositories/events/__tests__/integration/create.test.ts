import assert from "assert";
import { faker } from "@faker-js/faker";
import { DateTime } from "luxon";
import { Event } from "~/domain/events/event.js";
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
			const newEvent = Event.new({
				type: "SIGN_UPS",
				data: {
					name: faker.string.sample(),
					description: faker.lorem.paragraph(),
					startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
					contactEmail: faker.internet.email(),
					organizationId: organization.id,
					location: faker.location.streetAddress(),
					signUpDetails: {
						capacity: 10,
						signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
						signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
						slots: [
							{
								capacity: 10,
							},
						],
					},
				},
			});
			assert(newEvent.ok);
			const actual = await eventRepository.create(newEvent.data.event);
			assert(actual.ok);
			const slots = await prisma.eventSlot.findMany({
				where: {
					eventId: actual.data.event.id,
				},
			});
			expect(slots).toHaveLength(1);
			expect(slots[0]?.capacity).toBe(10);
			expect(actual.data.event.signUpsEnabled).toBe(true);
			assert(actual.data.event.type === "SIGN_UPS");
			expect(actual.data.event.signUpDetails?.capacity).toBe(10);
			expect(actual.data.event.signUpDetails?.remainingCapacity).toBe(10);
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
			const newEvent = Event.new({
				type: "BASIC",
				data: {
					name: faker.string.sample(),
					description: faker.lorem.paragraph(),
					startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
					contactEmail: faker.internet.email(),
					organizationId: organization.id,
					location: faker.location.streetAddress(),
				},
			});
			assert(newEvent.ok);
			const actual = await eventRepository.create(newEvent.data.event);
			assert(actual.ok);

			expect("slots" in actual).toBe(false);
			expect("signUpDetails" in actual.data.event).toBe(false);
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

			const newEvent = Event.new({
				type: "BASIC",
				data: {
					name: faker.string.sample(),
					description: faker.lorem.paragraph(),
					startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
					contactEmail: faker.internet.email(),
					organizationId: organization.id,
					location: faker.location.streetAddress(),
					// categories: [category.id],
					categories: [
						{
							id: category.id,
						},
					],
				},
			});
			assert(newEvent.ok);
			expect(newEvent.data.event.categories).toEqual([
				{
					id: category.id,
					name: category.name,
				},
			]);
		});
	});
});

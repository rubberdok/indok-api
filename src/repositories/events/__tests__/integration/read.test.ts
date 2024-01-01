import { faker } from "@faker-js/faker";
import prisma from "~/lib/prisma.js";
import { EventRepository } from "../../repository.js";

describe("EventRepository", () => {
	let eventRepository: EventRepository;
	beforeAll(() => {
		eventRepository = new EventRepository(prisma);
	});

	describe("#findMany", () => {
		it("should return a list of events", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create several events
			 */
			const eventIds = [
				faker.string.uuid(),
				faker.string.uuid(),
				faker.string.uuid(),
			];
			await Promise.all(
				eventIds.map((id) =>
					prisma.event.create({
						data: {
							id,
							name: faker.person.firstName(),
							startAt: faker.date.soon({
								refDate: new Date(2021, 0, 1),
								days: 1,
							}),
							endAt: faker.date.soon({
								refDate: new Date(2021, 0, 3),
								days: 1,
							}),
						},
					}),
				),
			);

			/**
			 * Act
			 *
			 * 1. Get the event
			 */
			const events = await eventRepository.findMany();

			/**
			 * Assert
			 *
			 * 1. The events should be returned
			 */
			expect(events.length).toBeGreaterThanOrEqual(3);
			for (const evnetId of eventIds) {
				expect(events.map((event) => event.id)).toContainEqual(evnetId);
			}
		});

		it("should only return events after endAtGte", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create several events
			 */
			const eventIds = [
				faker.string.uuid(),
				faker.string.uuid(),
				faker.string.uuid(),
			];
			await Promise.all(
				eventIds.map((id) =>
					prisma.event.create({
						data: {
							id,
							name: faker.person.firstName(),
							startAt: faker.date.soon({
								refDate: new Date(2021, 0, 1),
								days: 1,
							}),
							endAt: faker.date.soon({
								refDate: new Date(2021, 0, 3),
								days: 1,
							}),
						},
					}),
				),
			);

			const eventInThePast = await prisma.event.create({
				data: {
					id: faker.string.uuid(),
					name: faker.person.firstName(),
					startAt: new Date(2020, 0, 1),
					endAt: new Date(2020, 0, 3),
				},
			});

			/**
			 * Act
			 *
			 * 1. Get the event
			 */
			const events = await eventRepository.findMany({
				endAtGte: new Date(2021, 0, 1),
			});

			/**
			 * Assert
			 *
			 * 1. The event in the past should not have been returned
			 */
			for (const event of events) {
				expect(event.id).not.toEqual(eventInThePast.id);
			}
		});
	});

	describe("#getWithSlots", () => {
		it("should return an event with slots", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create an event with slots
			 */
			const organization = await prisma.organization.create({
				data: {
					name: faker.string.sample(20),
				},
			});
			const event = await eventRepository.create(
				{
					name: faker.word.adjective(),
					startAt: new Date(),
					endAt: new Date(),
					contactEmail: faker.internet.email(),
					organizationId: organization.id,
				},
				{
					slots: [{ capacity: 1 }, { capacity: 2 }, { capacity: 3 }],
					capacity: 5,
					signUpsEnabled: true,
					signUpsStartAt: new Date(),
					signUpsEndAt: new Date(),
				},
			);

			/**
			 * Act
			 *
			 * 1. Get the event
			 */
			const result = await eventRepository.getWithSlots(event.id);

			/**
			 * Assert
			 *
			 * 1. The event should have slots
			 */
			expect(result.slots).toBeDefined();
			expect(result.slots.length).toEqual(3);
		});
	});

	describe("#getCategories", () => {
		it("should return a list of categories", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create several categories
			 */
			const categoryIds = [
				faker.string.uuid(),
				faker.string.uuid(),
				faker.string.uuid(),
			];
			await Promise.all(
				categoryIds.map((id) =>
					prisma.eventCategory.create({
						data: {
							id,
							name: faker.person.firstName(),
						},
					}),
				),
			);

			/**
			 * Act
			 *
			 * 1. Get the categories
			 */
			const categories = await eventRepository.getCategories();

			/**
			 * Assert
			 *
			 * 1. The categories should be returned
			 */
			expect(categories.length).toBeGreaterThanOrEqual(3);
			for (const categoryId of categoryIds) {
				expect(categories.map((category) => category.id)).toContainEqual(
					categoryId,
				);
			}
		});
	});
});

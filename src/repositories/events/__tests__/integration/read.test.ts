import assert from "node:assert";
import { faker } from "@faker-js/faker";
import { DateTime } from "luxon";
import type { CategoryType } from "~/domain/events/category.js";
import { makeMockContext } from "~/lib/context.js";
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
							type: "BASIC",
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
							type: "BASIC",
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
					type: "BASIC",
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

		it("with organization id should only return events for that organization", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create several events
			 */
			const organization = await prisma.organization.create({
				data: {
					name: faker.string.sample(20),
				},
			});
			const eventIds = [
				faker.string.uuid(),
				faker.string.uuid(),
				faker.string.uuid(),
			];
			await Promise.all(
				eventIds.map((id) =>
					prisma.event.create({
						data: {
							type: "BASIC",
							id,
							organizationId: organization.id,
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

			const eventWithoutOrganization = await prisma.event.create({
				data: {
					type: "BASIC",
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
				organizationId: organization.id,
			});

			/**
			 * Assert
			 *
			 * 1. The event in the past should not have been returned
			 */
			for (const event of events) {
				expect(event.id).not.toEqual(eventWithoutOrganization.id);
			}
			expect(events).toContainEqual(
				expect.objectContaining({ id: eventIds[0] }),
			);
			expect(events).toContainEqual(
				expect.objectContaining({ id: eventIds[1] }),
			);
			expect(events).toContainEqual(
				expect.objectContaining({ id: eventIds[2] }),
			);
		});

		it("returns only events for the given organizations", async () => {
			/**
			 * Arrange
			 *
			 * 1. create several organizations with events
			 */
			const organization1 = await makeOrganization();
			const event1 = await makeEvent({ organizationId: organization1.id });
			const event2 = await makeEvent({ organizationId: organization1.id });

			const organization2 = await makeOrganization();
			const event3 = await makeEvent({ organizationId: organization2.id });
			const event4 = await makeEvent({ organizationId: organization2.id });

			const organization3 = await makeOrganization();
			const event5 = await makeEvent({ organizationId: organization3.id });

			await makeOrganization();

			/**
			 * Act
			 *
			 * 1. Get the event
			 */
			const events = await eventRepository.findMany({
				organizations: [{ id: organization1.id }, { id: organization2.id }],
			});

			expect(events).toContainEqual(event1);
			expect(events).toContainEqual(event2);
			expect(events).toContainEqual(event3);
			expect(events).toContainEqual(event4);
			expect(events).not.toContainEqual(event5);
		});

		it("returns only events for the given categories", async () => {
			/**
			 * Arrange
			 *
			 * 1. create several organizations with events
			 */
			const organization1 = await makeOrganization();
			const category1 = await makeCategory();
			const category2 = await makeCategory();
			const category3 = await makeCategory();
			const event1 = await makeEvent({
				organizationId: organization1.id,
				categories: [
					{ id: category1.id },
					{ id: category2.id },
					{ id: category3.id },
				],
			});
			const event2 = await makeEvent({
				organizationId: organization1.id,
				categories: [{ id: category1.id }, { id: category2.id }],
			});
			const event3 = await makeEvent({
				organizationId: organization1.id,
				categories: [{ id: category3.id }],
			});

			/**
			 * Act
			 *
			 * 1. Get the event
			 */
			const events = await eventRepository.findMany({
				categories: [{ id: category1.id }, { id: category2.id }],
			});

			expect(events).toContainEqual(event1);
			expect(events).toContainEqual(event2);
			expect(events).not.toContainEqual(event3);
		});

		it("returns only events between startAfter/endBefore", async () => {
			/**
			 * Arrange
			 *
			 * 1. create several organizations with events
			 */
			const organization1 = await makeOrganization();
			const event1 = await makeEvent({
				organizationId: organization1.id,
				startAt: DateTime.fromObject({ day: 1, hour: 18 }).toJSDate(),
				endAt: DateTime.fromObject({ day: 1, hour: 20 }).toJSDate(),
			});
			const event2 = await makeEvent({
				organizationId: organization1.id,
				startAt: DateTime.fromObject({ day: 1, hour: 10 }).toJSDate(),
				endAt: DateTime.fromObject({ day: 1, hour: 12 }).toJSDate(),
			});
			const event3 = await makeEvent({
				organizationId: organization1.id,
				startAt: DateTime.fromObject({ day: 2, hour: 1 }).toJSDate(),
				endAt: DateTime.fromObject({ day: 2, hour: 3 }).toJSDate(),
			});

			/**
			 * Act
			 *
			 * 1. Get the event
			 */
			const events = await eventRepository.findMany({
				startAfter: DateTime.fromObject({ day: 1 }).toJSDate(),
				endBefore: DateTime.fromObject({ day: 1 }).toJSDate(),
			});

			expect(events).toContainEqual(event1);
			expect(events).toContainEqual(event2);
			expect(events).not.toContainEqual(event3);
		});

		it("returns events matching filters", async () => {
			/**
			 * Arrange
			 *
			 * 1. create several organizations with events
			 */
			const organization1 = await makeOrganization();
			const category1 = await makeCategory();
			const category2 = await makeCategory();
			const event1 = await makeEvent({
				organizationId: organization1.id,
				startAt: DateTime.fromObject({ day: 1, hour: 18 }).toJSDate(),
				endAt: DateTime.fromObject({ day: 1, hour: 20 }).toJSDate(),
				categories: [{ id: category1.id }],
			});
			const event2 = await makeEvent({
				organizationId: organization1.id,
				startAt: DateTime.fromObject({ day: 2, hour: 18 }).toJSDate(),
				endAt: DateTime.fromObject({ day: 2, hour: 20 }).toJSDate(),
				categories: [{ id: category2.id }],
			});

			/**
			 * Act
			 *
			 * 1. Get the event
			 */
			const events = await eventRepository.findMany({
				startAfter: DateTime.fromObject({ day: 1, hour: 18 }).toJSDate(),
				endBefore: DateTime.fromObject({ day: 1, hour: 20 }).toJSDate(),
				organizations: [{ id: organization1.id }],
				categories: [{ id: category1.id }],
			});

			expect(events).toContainEqual(event1);
			expect(events).not.toContainEqual(event2);
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
			const event = await eventRepository.create(makeMockContext(), {
				event: {
					id: faker.string.uuid(),
					version: 0,
					name: faker.word.adjective(),
					startAt: new Date(),
					endAt: new Date(),
					contactEmail: faker.internet.email(),
					organizationId: organization.id,
					signUpsEnabled: true,
					type: "SIGN_UPS",
					location: "",
					description: "",
					shortDescription: "",
					capacity: 5,
					remainingCapacity: 5,
					signUpsStartAt: new Date(),
					signUpsEndAt: new Date(),
					signUpsRetractable: false,
					signUpsRequireUserProvidedInformation: false,
				},
				slots: [
					{
						capacity: 1,
						remainingCapacity: 1,
						id: faker.string.uuid(),
						version: 0,
					},
					{
						capacity: 2,
						remainingCapacity: 2,
						id: faker.string.uuid(),
						version: 0,
					},
					{
						capacity: 3,
						remainingCapacity: 3,
						id: faker.string.uuid(),
						version: 0,
					},
				],
			});
			assert(event.ok);

			/**
			 * Act
			 *
			 * 1. Get the event
			 */
			const result = await eventRepository.getWithSlotsAndCategories({
				id: event.data.event.id,
			});
			assert(result.ok);

			/**
			 * Assert
			 *
			 * 1. The event should have slots
			 */
			expect(result.data.slots).toBeDefined();
			expect(result.data.slots?.length).toEqual(3);
		});
	});

	describe("#getCategories", () => {
		it("should return a list of categories", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create several categories
			 */
			const expectedCategories: CategoryType[] = [];
			for (let i = 0; i < 3; i++) {
				const category = await eventRepository.createCategory({
					name: faker.string.sample(20),
				});
				expectedCategories.push(category);
			}

			/**
			 * Act
			 *
			 * 1. Get the categories
			 */
			const actualCategories = await eventRepository.getCategories();

			/**
			 * Assert
			 *
			 * 1. The categories should be returned
			 */
			expect(actualCategories.length).toBeGreaterThanOrEqual(3);
			const actualCategoryIds = actualCategories.map((category) => category.id);
			for (const expected of expectedCategories) {
				const id = expected.id;
				expect(actualCategoryIds).toContain(id);
			}
		});
	});

	async function makeEvent(params: {
		organizationId: string;
		startAt?: Date;
		endAt?: Date;
		categories?: { id: string }[];
	}) {
		const createEventResult = await eventRepository.create(makeMockContext(), {
			event: {
				type: "BASIC",
				contactEmail: faker.internet.email(),
				description: faker.lorem.paragraph(),
				id: faker.string.uuid(),
				location: faker.location.streetAddress(),
				name: faker.word.adjective(),
				organizationId: params.organizationId,
				shortDescription: faker.lorem.sentence(),
				signUpsEnabled: false,
				signUpsRequireUserProvidedInformation: false,
				signUpsRetractable: true,
				startAt: params.startAt ?? DateTime.now().plus({ days: 1 }).toJSDate(),
				endAt: params.endAt ?? DateTime.now().plus({ days: 2 }).toJSDate(),
				version: 0,
			},
			categories: params.categories,
		});
		if (!createEventResult.ok) throw createEventResult.error;
		return createEventResult.data.event;
	}

	async function makeOrganization() {
		const createOrganizationResult = await prisma.organization.create({
			data: {
				name: faker.string.uuid(),
			},
		});
		return createOrganizationResult;
	}

	async function makeCategory() {
		return await eventRepository.createCategory({
			name: faker.string.sample(20),
		});
	}
});

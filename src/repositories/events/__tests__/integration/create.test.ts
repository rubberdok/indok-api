import { faker } from "@faker-js/faker";
import { DateTime } from "luxon";
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
			const actual = await eventRepository.create(
				{
					name: faker.string.sample(),
					description: faker.lorem.paragraph(),
					startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
					contactEmail: faker.internet.email(),
					organizationId: organization.id,
					location: faker.location.streetAddress(),
				},
				{
					signUpsEnabled: true,
					capacity: 10,
					signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					slots: [
						{
							capacity: 10,
						},
					],
				},
			);
			const slots = await prisma.eventSlot.findMany({
				where: {
					eventId: actual.id,
				},
			});
			expect(slots).toHaveLength(1);
			expect(slots[0]?.capacity).toBe(10);
			expect(actual.signUpsEnabled).toBe(true);
			expect(actual.signUpDetails?.capacity).toBe(10);
			expect(actual.signUpDetails?.remainingCapacity).toBe(10);
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
			const actual = await eventRepository.create({
				name: faker.string.sample(),
				description: faker.lorem.paragraph(),
				startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
				endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
				contactEmail: faker.internet.email(),
				organizationId: organization.id,
				location: faker.location.streetAddress(),
			});

			expect("slots" in actual).toBe(false);
			expect(actual.signUpDetails).toBe(undefined);
			expect(actual.signUpsEnabled).toBe(false);
		});
	});
});

import { faker } from "@faker-js/faker";
import { InternalServerError } from "~/domain/errors.js";
import type { EventType, EventUpdateFn } from "~/domain/events/event.js";
import { makeMockContext } from "~/lib/context.js";
import prisma from "~/lib/prisma.js";
import type { Result } from "~/lib/result.js";
import { EventRepository } from "../../repository.js";

let eventsRepository: EventRepository;

describe("EventsRepository", () => {
	beforeAll(() => {
		eventsRepository = new EventRepository(prisma);
	});

	describe("update", () => {
		interface TestCase {
			name: string;
			updateFn: EventUpdateFn<InternalServerError>;
			expected: Result<{ event: EventType }, InternalServerError>;
		}

		const testCases: TestCase[] = [
			{
				name: "should update all defined fields",
				updateFn: ({ event }) => {
					const newEvent = { ...event };
					newEvent.name = "New Name";
					newEvent.description = "New Description";
					newEvent.shortDescription = "New Short Description";
					return Promise.resolve({
						ok: true,
						data: {
							event: newEvent,
						},
					});
				},
				expected: {
					ok: true,
					data: expect.objectContaining({
						event: expect.objectContaining({
							name: "New Name",
							description: "New Description",
							shortDescription: "New Short Description",
						}),
					}),
				},
			},
			{
				name: "should not update undefined fields",
				updateFn: ({ event }) => {
					return Promise.resolve({
						ok: false,
						error: new InternalServerError("Something went wrong"),
					});
				},
				expected: expect.objectContaining({
					ok: false,
					error: new InternalServerError("Something went wrong"),
				}),
			},
		];

		test.concurrent.each(testCases)("$name", async ({ updateFn, expected }) => {
			/**
			 * Arrange
			 *
			 * 1. Create an organization with organizationId {organizationId} to act as the organization that the event belongs to
			 * 2. Create an event with eventId {eventId} that belongs to the organization with organizationId {organizationId}
			 */
			const organization = await prisma.organization.create({
				data: {
					name: faker.string.sample(20),
				},
			});

			const startAt = faker.date.future();
			const event = await eventsRepository.create(makeMockContext(), {
				event: {
					id: faker.string.uuid(),
					version: 0,
					type: "BASIC",
					name: faker.company.name(),
					description: faker.lorem.paragraph(),
					shortDescription: faker.lorem.sentence(),
					startAt,
					endAt: faker.date.future({ refDate: startAt }),
					organizationId: organization.id,
					contactEmail: faker.internet.email(),
					location: faker.location.streetAddress(),
					signUpsEnabled: false,
					signUpsRetractable: true,
					signUpsRequireUserProvidedInformation: false,
				},
			});
			if (!event.ok) throw event.error;

			/**
			 * Act
			 *
			 * Update the event with the values from {data}
			 */
			const result = eventsRepository.update(
				makeMockContext(),
				event.data.event.id,
				updateFn,
			);

			/**
			 * Assert that only defined fields have been updated
			 */
			await expect(result).resolves.toEqual(expected);
		});
	});
});

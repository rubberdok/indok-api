import { faker } from "@faker-js/faker";
import { jest } from "@jest/globals";
import type { DeepMockProxy } from "jest-mock-extended";
import type { EventRepository, EventService } from "../../service.js";
import { makeDependencies } from "./dependencies.js";

describe("EventService", () => {
	let eventService: InstanceType<typeof EventService>;
	let eventRepository: DeepMockProxy<EventRepository>;

	beforeAll(() => {
		const deps = makeDependencies();
		eventService = deps.service;
		eventRepository = deps.eventsRepository;
		jest.useFakeTimers();
	});

	afterAll(() => {
		jest.useRealTimers();
	});

	describe("#findMany", () => {
		it("should try to fetch events for an organization", async () => {
			/**
			 * Arrange
			 */
			const organizationId = faker.string.uuid();

			/**
			 * Act
			 */
			await eventService.findMany({ organizationId });
			expect(eventRepository.findMany).toHaveBeenCalledWith({
				organizationId,
			});
		});

		it("should try to fetch events in the future", async () => {
			/**
			 * Arrange
			 */
			jest.setSystemTime(new Date(2021, 0, 1));
			/**
			 * Act
			 */
			await eventService.findMany({ onlyFutureEvents: true });
			expect(eventRepository.findMany).toHaveBeenCalledWith({
				endAtGte: new Date(2021, 0, 1),
			});
		});
	});
});

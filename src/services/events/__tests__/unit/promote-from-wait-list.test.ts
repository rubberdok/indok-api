import { fail } from "node:assert";
import { faker } from "@faker-js/faker";
import { type DeepMockProxy, mock } from "jest-mock-extended";
import { InvalidArgumentError } from "~/domain/errors.js";
import type { User } from "~/domain/users.js";
import { makeMockContext } from "~/lib/context.js";
import type { EventRepository, EventService } from "../../service.js";
import { makeBasicEvent, makeSignUpEvent } from "../dependencies.js";
import { makeDependencies } from "./dependencies.js";

describe("EventService", () => {
	let service: EventService;
	let eventsRepository: DeepMockProxy<EventRepository>;

	beforeAll(() => {
		({ eventsRepository, service } = makeDependencies());
	});

	describe("#promoteFromWaitList", () => {
		it("should throw InvalidArgumentError if the event is a BASIC event", async () => {
			const ctx = makeMockContext(mock<User>());
			eventsRepository.get.mockResolvedValue(makeBasicEvent());

			try {
				await service.promoteFromWaitList(ctx, faker.string.uuid());
				fail("Expected to throw an error");
			} catch (err) {
				expect(err).toBeInstanceOf(InvalidArgumentError);
			}
		});

		it("should throw InvalidArgumentError if the remaining capacity is 0", async () => {
			const ctx = makeMockContext(mock<User>());
			eventsRepository.get.mockResolvedValue(
				makeSignUpEvent({ remainingCapacity: 0 }),
			);

			try {
				await service.promoteFromWaitList(ctx, faker.string.uuid());
				fail("Expected to throw an error");
			} catch (err) {
				expect(err).toBeInstanceOf(InvalidArgumentError);
			}
		});
	});
});

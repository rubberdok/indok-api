import assert from "node:assert";
import { faker } from "@faker-js/faker";
import { merge } from "lodash-es";
import { DateTime } from "luxon";
import {
	EventParticipationStatus,
	type EventParticipationStatusType,
} from "~/domain/events/sign-ups.js";
import { makeMockContext } from "~/lib/context.js";
import prisma from "~/lib/prisma.js";
import type { EventService } from "../../service.js";
import {
	makeServices,
	makeUserWithOrganizationMembership,
} from "./dependencies-factory.js";

describe("EventService", () => {
	let eventService: EventService;

	beforeAll(() => {
		({ eventService } = makeServices());
	});

	describe("promoteFromWaitlist", () => {
		it("should promote the first sign up from the waitlist", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create an event with capacity
			 * 2. Create a slot for the event with capacity
			 * 3. Create 3 users
			 * 4. Create 3 sign ups for the event, one for each user, with status ON_WAITLIST
			 */
			const { user, organization } = await makeUserWithOrganizationMembership();
			const createEvent = await eventService.create(makeMockContext(user), {
				event: {
					organizationId: organization.id,
					name: faker.word.adjective(),
					startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					endAt: DateTime.now().plus({ days: 2 }).toJSDate(),
					signUpsEnabled: true,
					capacity: 1,
					signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
				},
				slots: [
					{
						capacity: 1,
					},
				],
				type: "SIGN_UPS",
			});

			assert(createEvent.ok);
			const { event } = createEvent.data;
			const slot = await prisma.eventSlot.findFirstOrThrow({
				where: {
					eventId: event.id,
				},
			});

			const user1 = await makeUser();
			const user2 = await makeUser();
			const user3 = await makeUser();

			await makeSignUp({
				userId: user1.id,
				eventId: event.id,
				participationStatus: EventParticipationStatus.CONFIRMED,
				slotId: slot.id,
			});
			const signUp2 = await makeSignUp({
				userId: user2.id,
				eventId: event.id,
			});
			await makeSignUp({
				userId: user3.id,
				eventId: event.id,
			});

			/**
			 * Act
			 *
			 * Call promoteFromWaitList for the event
			 */
			const actual = await eventService.promoteFromWaitList(
				makeMockContext(),
				event.id,
			);

			/**
			 * Assert
			 *
			 * 1. The first sign up should be promoted from the waitlist
			 * 2. The sign up should have status CONFIRMED
			 * 3. The sign up should belong to the slot
			 * 4. The sign up version should be incremented
			 * 5. The slot remaining capacity should be decreased
			 * 6. The event remaining capacity should be decreased
			 */
			expect(actual).toEqual(
				merge(signUp2, {
					slotId: slot.id,
					participationStatus: EventParticipationStatus.CONFIRMED,
					version: 1,
					updatedAt: expect.any(Date),
				}),
			);

			const updatedSlot = await prisma.eventSlot.findUnique({
				where: { id: slot.id },
			});
			expect(updatedSlot?.remainingCapacity).toBe(slot.remainingCapacity - 1);
			const updatedEvent = await prisma.event.findUnique({
				where: { id: event.id },
			});
			assert(event.type === "SIGN_UPS");
			expect(updatedEvent?.remainingCapacity).toBe(
				(event.remainingCapacity ?? Number.NaN) - 1,
			);
		});
	});
});

function makeUser() {
	return prisma.user.create({
		data: {
			firstName: faker.person.firstName(),
			lastName: faker.person.lastName(),
			email: faker.internet.email(),
			username: faker.string.sample(20),
			feideId: faker.string.uuid(),
		},
	});
}

function makeSignUp({
	userId,
	eventId,
	slotId,
	participationStatus = EventParticipationStatus.ON_WAITLIST,
}: {
	userId: string;
	eventId: string;
	slotId?: string;
	participationStatus?: EventParticipationStatusType;
}) {
	return prisma.eventSignUp.create({
		data: {
			userId,
			eventId,
			participationStatus,
			slotId,
		},
	});
}

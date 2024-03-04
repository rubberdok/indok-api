import { faker } from "@faker-js/faker";
import { DateTime } from "luxon";
import { InvalidArgumentError } from "~/domain/errors.js";
import { makeMockContext } from "~/lib/context.js";
import prisma from "~/lib/prisma.js";
import { EventRepository } from "../../repository.js";

describe("Events repository", () => {
	let eventsRepository: InstanceType<typeof EventRepository>;

	beforeAll(() => {
		eventsRepository = new EventRepository(prisma);
	});

	describe("#getEarlierSignUpsOnWaitList", () => {
		it("should return earlier sign-ups on wait list", async () => {
			const event = await makeEvent();

			const user1 = await makeUser();
			const user2 = await makeUser();

			await makeSignUp({
				eventId: event.id,
				userId: user1.id,
			});

			const signUp2 = await makeSignUp({
				eventId: event.id,
				userId: user2.id,
			});
			/**
			 * Get earlier sign-ups on wait list, should return a single sign up.
			 */

			const earlierSignUpsOnWaitList =
				await eventsRepository.getEarlierSignUpsOnWaitList({
					eventId: event.id,
					createdAt: signUp2.signUp.createdAt,
				});
			if (!earlierSignUpsOnWaitList.ok) throw earlierSignUpsOnWaitList.error;

			expect(earlierSignUpsOnWaitList.data.count).toEqual(1);
		});

		it("should return 0 if the event does not exist", async () => {
			const earlierSignUpsOnWaitList =
				await eventsRepository.getEarlierSignUpsOnWaitList({
					eventId: faker.string.uuid(),
					createdAt: faker.date.future(),
				});
			if (!earlierSignUpsOnWaitList.ok) throw earlierSignUpsOnWaitList.error;

			expect(earlierSignUpsOnWaitList.data.count).toEqual(0);
		});

		it("should return InvalidArgumentError if eventId is not a UUID", async () => {
			const earlierSignUpsOnWaitList =
				await eventsRepository.getEarlierSignUpsOnWaitList({
					eventId: faker.string.sample(10),
					createdAt: faker.date.future(),
				});

			expect(earlierSignUpsOnWaitList).toEqual({
				ok: false,
				error: expect.any(InvalidArgumentError),
			});
		});
	});

	function makeSignUp(params: { userId: string; eventId: string }) {
		return eventsRepository.createSignUp({
			eventId: params.eventId,
			userId: params.userId,
			participationStatus: "ON_WAITLIST",
		});
	}

	function makeUser() {
		return prisma.user.create({
			data: {
				email: faker.internet.email({ firstName: faker.string.uuid() }),
				feideId: faker.string.uuid(),
				username: faker.string.uuid(),
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
			},
		});
	}

	async function makeEvent() {
		const organization = await prisma.organization.create({
			data: {
				name: faker.string.sample(20),
			},
		});

		const createEventResult = await eventsRepository.create(makeMockContext(), {
			event: {
				type: "SIGN_UPS",
				capacity: 0,
				contactEmail: "",
				description: "",
				shortDescription: "",
				endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
				startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
				location: "",
				name: faker.word.adjective(),
				id: faker.string.uuid(),
				organizationId: organization.id,
				remainingCapacity: 1,
				signUpsEnabled: true,
				signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
				signUpsStartAt: DateTime.now().toJSDate(),
				version: 0,
				signUpsRequireUserProvidedInformation: false,
				signUpsRetractable: true,
			},
			slots: [],
		});
		if (!createEventResult.ok) throw createEventResult.error;
		const event = createEventResult.data.event;
		return event;
	}
});

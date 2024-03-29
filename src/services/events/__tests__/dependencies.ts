import { faker } from "@faker-js/faker";
import { DateTime } from "luxon";
import type {
	BasicEvent,
	SignUpEvent,
	TicketEvent,
} from "~/domain/events/event.js";

function makeSignUpEvent(data?: Partial<SignUpEvent>): SignUpEvent {
	const {
		capacity,
		signUpsStartAt,
		signUpsEndAt,
		remainingCapacity,
		type,
		signUpsRequireUserProvidedInformation,
		signUpsRetractable,
		...basicEventData
	} = data ?? {};
	const basicEvent = makeBasicEvent(basicEventData);
	return {
		...basicEvent,
		capacity: capacity ?? 10,
		remainingCapacity: remainingCapacity ?? 10,
		signUpsStartAt:
			signUpsStartAt ?? DateTime.now().plus({ days: 1 }).toJSDate(),
		signUpsEndAt: signUpsEndAt ?? DateTime.now().plus({ days: 2 }).toJSDate(),
		type: type ?? "SIGN_UPS",
		signUpsRetractable: signUpsRetractable ?? false,
		signUpsRequireUserProvidedInformation:
			signUpsRequireUserProvidedInformation ?? false,
	};
}

function makeTicketEvent(data?: Partial<TicketEvent>): TicketEvent {
	const { productId, type, ...signUpEventData } = data ?? {};
	const signUpEvent = makeSignUpEvent(signUpEventData);
	return {
		...signUpEvent,
		productId: productId ?? faker.string.uuid(),
		type: type ?? "TICKETS",
		signUpsRetractable: false,
	};
}

function makeBasicEvent(data?: Partial<BasicEvent>): BasicEvent {
	return {
		id: faker.string.uuid(),
		name: faker.commerce.productName(),
		description: faker.lorem.paragraph(),
		shortDescription: faker.company.catchPhrase(),
		startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
		endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
		location: faker.location.streetAddress(),
		contactEmail: faker.internet.email(),
		organizationId: faker.string.uuid(),
		signUpsEnabled: false,
		version: 0,
		type: "BASIC",
		signUpsRetractable: true,
		signUpsRequireUserProvidedInformation: false,
		...data,
	};
}

export { makeBasicEvent, makeSignUpEvent, makeTicketEvent };

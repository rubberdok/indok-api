import { faker } from "@faker-js/faker";
import type { Prisma, PrismaClient } from "@prisma/client";
import { DateTime } from "luxon";
import { env } from "~/config.js";
import { fakeMarkdown, toTitleCase } from "../seed.js";

faker.seed(42);

const fakeName = () => {
	return toTitleCase(
		`${faker.word.adjective()} ${faker.word.verb()} ${faker.word.adverb()}`,
	);
};

const eventCreateInput: Prisma.EventCreateInput[] = [
	{
		type: "BASIC",
		id: faker.string.uuid(),
		location: faker.location.streetAddress(),
		description: fakeMarkdown(),
		shortDescription: faker.company.catchPhrase(),
		name: `${fakeName()} [BASIC]`,
		startAt: DateTime.now().plus({ week: 1 }).toJSDate(),
		endAt: DateTime.now().plus({ week: 1, hours: 2 }).toJSDate(),
		categories: {
			connectOrCreate: {
				where: {
					name: "Fest",
				},
				create: {
					name: "Fest",
				},
			},
		},
		organization: {
			connectOrCreate: {
				where: {
					name: "Rubberdøk",
				},
				create: {
					name: "Rubberdøk",
					description: faker.lorem.paragraph(),
				},
			},
		},
	},
	{
		type: "BASIC",
		id: faker.string.uuid(),
		location: faker.location.streetAddress(),
		description: fakeMarkdown(),
		shortDescription: faker.company.catchPhrase(),
		name: `${fakeName()} [BASIC]`,
		startAt: DateTime.now().plus({ weeks: 2 }).toJSDate(),
		endAt: DateTime.now().plus({ weeks: 2, hours: 2 }).toJSDate(),
		organization: {
			connectOrCreate: {
				where: {
					name: "Hyttestyret",
				},
				create: {
					name: "Hyttestyret",
					description: faker.lorem.paragraph(),
				},
			},
		},
	},
	{
		type: "BASIC",
		id: faker.string.uuid(),
		location: faker.location.streetAddress(),
		description: fakeMarkdown(),
		shortDescription: faker.company.catchPhrase(),
		name: `${fakeName()} [BASIC]`,
		startAt: DateTime.now().plus({ year: 1 }).toJSDate(),
		endAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
		organization: {
			connectOrCreate: {
				where: {
					name: "Bindeleddet",
				},
				create: {
					name: "Bindeleddet",
					description: faker.lorem.paragraph(),
				},
			},
		},
	},
	{
		type: "SIGN_UPS",
		id: faker.string.uuid(),
		location: faker.location.streetAddress(),
		name: `${fakeName()} [SIGN_UPS] [RETRACTABLE]`,
		startAt: DateTime.now().plus({ year: 1 }).toJSDate(),
		endAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
		capacity: 10,
		remainingCapacity: 10,
		description: fakeMarkdown(),
		shortDescription: faker.company.catchPhrase(),
		signUpsEnabled: true,
		signUpsStartAt: DateTime.now().minus({ day: 1 }).toJSDate(),
		signUpsEndAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
		signUpsRetractable: true,
		organization: {
			connectOrCreate: {
				where: {
					name: "Rubberdøk",
				},
				create: {
					name: "Rubberdøk",
					description: faker.lorem.paragraph(),
				},
			},
		},
		slots: {
			createMany: {
				data: [
					{ capacity: 5, remainingCapacity: 5, gradeYears: [1, 2, 3] },
					{ capacity: 5, remainingCapacity: 5, gradeYears: [3, 4, 5] },
				],
			},
		},
	},
	{
		type: "SIGN_UPS",
		id: faker.string.uuid(),
		name: `${fakeName()} [SIGN_UPS] [USER_PROVIDED_INFORMATION]`,
		location: faker.location.streetAddress(),
		startAt: DateTime.now().plus({ year: 1 }).toJSDate(),
		endAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
		capacity: 10,
		remainingCapacity: 10,
		description: fakeMarkdown(),
		shortDescription: faker.company.catchPhrase(),
		signUpsEnabled: true,
		signUpsStartAt: DateTime.now().minus({ day: 1 }).toJSDate(),
		signUpsEndAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
		signUpsRequireUserProvidedInformation: true,
		organization: {
			connectOrCreate: {
				where: {
					name: "Janus",
				},
				create: {
					name: "Janus",
					description: faker.lorem.paragraph(),
				},
			},
		},
		slots: {
			createMany: {
				data: [
					{ capacity: 5, remainingCapacity: 5, gradeYears: [1, 2, 3] },
					{ capacity: 5, remainingCapacity: 5, gradeYears: [3, 4, 5] },
				],
			},
		},
	},
	{
		type: "SIGN_UPS",
		id: faker.string.uuid(),
		name: `${fakeName()} [SIGN_UPS] [WAIT_LIST]`,
		location: faker.location.streetAddress(),
		startAt: DateTime.now().plus({ year: 1 }).toJSDate(),
		endAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
		capacity: 10,
		remainingCapacity: 0,
		description: fakeMarkdown(),
		shortDescription: faker.company.catchPhrase(),
		signUpsEnabled: true,
		signUpsStartAt: DateTime.now().plus({ minutes: 2 }).toJSDate(),
		signUpsEndAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
		signUpsRequireUserProvidedInformation: true,
		signUpsRetractable: true,
		organization: {
			connectOrCreate: {
				where: {
					name: "Bandøk",
				},
				create: {
					name: "Bandøk",
					description: faker.lorem.paragraph(),
				},
			},
		},
		slots: {
			createMany: {
				data: [
					{ capacity: 5, remainingCapacity: 5, gradeYears: [1, 2, 3] },
					{ capacity: 5, remainingCapacity: 5, gradeYears: [3, 4, 5] },
				],
			},
		},
	},
	{
		type: "SIGN_UPS",
		id: faker.string.uuid(),
		name: `${fakeName()} [SIGN_UPS] [FUTURE]`,
		location: faker.location.streetAddress(),
		startAt: DateTime.now().plus({ year: 1 }).toJSDate(),
		endAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
		capacity: 10,
		remainingCapacity: 0,
		description: fakeMarkdown(),
		shortDescription: faker.company.catchPhrase(),
		signUpsEnabled: true,
		signUpsStartAt: DateTime.now().plus({ year: 1 }).toJSDate(),
		signUpsEndAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
		signUpsRequireUserProvidedInformation: true,
		signUpsRetractable: true,
		organization: {
			connectOrCreate: {
				where: {
					name: "Bandøk",
				},
				create: {
					name: "Bandøk",
					description: faker.lorem.paragraph(),
				},
			},
		},
		slots: {
			createMany: {
				data: [
					{ capacity: 5, remainingCapacity: 5, gradeYears: [1, 2, 3] },
					{ capacity: 5, remainingCapacity: 5, gradeYears: [3, 4, 5] },
				],
			},
		},
	},
	{
		type: "TICKETS",
		id: faker.string.uuid(),
		name: `${fakeName()} [TICKETS]`,
		location: faker.location.streetAddress(),
		startAt: DateTime.now().plus({ year: 1 }).toJSDate(),
		endAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
		capacity: 10,
		remainingCapacity: 10,
		description: fakeMarkdown(),
		shortDescription: faker.company.catchPhrase(),
		signUpsEnabled: true,
		signUpsStartAt: DateTime.now().minus({ minutes: 2 }).toJSDate(),
		signUpsEndAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
		organization: {
			connectOrCreate: {
				where: {
					name: "Rubberdøk",
				},
				create: {
					name: "Rubberdøk",
					description: faker.lorem.paragraph(),
				},
			},
		},
		slots: {
			createMany: {
				data: [
					{ capacity: 5, remainingCapacity: 5, gradeYears: [1, 2, 3] },
					{ capacity: 5, remainingCapacity: 5, gradeYears: [3, 4, 5] },
				],
			},
		},
		product: {
			create: {
				name: "Billett",
				price: 100 * 100,
				description: "Billett til noe",
				merchant: {
					connectOrCreate: {
						where: {
							clientId: env.VIPPS_DEFAULT_CLIENT_ID,
						},
						create: {
							clientId: env.VIPPS_DEFAULT_CLIENT_ID ?? faker.string.uuid(),
							clientSecret:
								env.VIPPS_DEFAULT_CLIENT_SECRET ?? faker.string.uuid(),
							serialNumber:
								env.VIPPS_DEFAULT_MERCHANT_SERIAL_NUMBER ?? faker.string.uuid(),
							name: "Indøk NTNU",
							subscriptionKey:
								env.VIPPS_DEFAULT_SUBSCRIPTION_KEY ?? faker.string.uuid(),
						},
					},
				},
			},
		},
	},
	{
		type: "TICKETS",
		id: faker.string.uuid(),
		name: `${fakeName()} [TICKETS] [WAIT_LIST]`,
		location: faker.location.streetAddress(),
		startAt: DateTime.now().plus({ year: 1 }).toJSDate(),
		endAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
		capacity: 10,
		remainingCapacity: 0,
		description: fakeMarkdown(),
		shortDescription: faker.company.catchPhrase(),
		signUpsEnabled: true,
		signUpsStartAt: DateTime.now().minus({ minutes: 2 }).toJSDate(),
		signUpsEndAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
		organization: {
			connectOrCreate: {
				where: {
					name: "Rubberdøk",
				},
				create: {
					name: "Rubberdøk",
					description: faker.lorem.paragraph(),
				},
			},
		},
		slots: {
			createMany: {
				data: [
					{ capacity: 5, remainingCapacity: 5, gradeYears: [1, 2, 3] },
					{ capacity: 5, remainingCapacity: 5, gradeYears: [3, 4, 5] },
				],
			},
		},
		product: {
			create: {
				name: "Billett",
				price: 100 * 100,
				description: "Billett til noe",
				merchant: {
					connectOrCreate: {
						where: {
							clientId: env.VIPPS_DEFAULT_CLIENT_ID,
						},
						create: {
							clientId: env.VIPPS_DEFAULT_CLIENT_ID ?? faker.string.uuid(),
							clientSecret:
								env.VIPPS_DEFAULT_CLIENT_SECRET ?? faker.string.uuid(),
							serialNumber:
								env.VIPPS_DEFAULT_MERCHANT_SERIAL_NUMBER ?? faker.string.uuid(),
							name: "Indøk NTNU",
							subscriptionKey:
								env.VIPPS_DEFAULT_SUBSCRIPTION_KEY ?? faker.string.uuid(),
						},
					},
				},
			},
		},
	},
];

export const load = async (db: PrismaClient) => {
	console.log("Seeding events");
	for (const event of eventCreateInput) {
		await db.event.upsert({
			where: {
				id: event.id,
			},
			update: event,
			create: event,
		});
	}
	const events = await db.event.findMany({
		select: {
			id: true,
			name: true,
			organizationId: true,
			startAt: true,
		},
	});

	return events;
};

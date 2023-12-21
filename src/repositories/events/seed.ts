import { faker } from "@faker-js/faker";
import { Prisma, PrismaClient } from "@prisma/client";
import { startCase, toLower } from "lodash-es";
import { DateTime } from "luxon";

faker.seed(42);

const toTitleCase = (str: string) => {
	return startCase(toLower(str));
};

const fakeName = () => {
	return toTitleCase(
		`${faker.word.adjective()} ${faker.word.verb()} ${faker.word.adverb()}`,
	);
};

const eventCreateInput: Prisma.EventCreateInput[] = [
	{
		id: faker.string.uuid(),
		location: faker.location.streetAddress(),
		description: fakeMarkdown(),
		name: fakeName(),
		startAt: DateTime.now().plus({ week: 1 }).toJSDate(),
		endAt: DateTime.now().plus({ week: 1, hours: 2 }).toJSDate(),
	},
	{
		id: faker.string.uuid(),
		location: faker.location.streetAddress(),
		description: fakeMarkdown(),
		name: fakeName(),
		startAt: DateTime.now().plus({ day: 1 }).toJSDate(),
		endAt: DateTime.now().plus({ day: 1, hours: 2 }).toJSDate(),
	},
	{
		id: faker.string.uuid(),
		location: faker.location.streetAddress(),
		description: fakeMarkdown(),
		name: fakeName(),
		startAt: DateTime.now().plus({ weeks: 2 }).toJSDate(),
		endAt: DateTime.now().plus({ weeks: 2, hours: 2 }).toJSDate(),
	},
	{
		id: faker.string.uuid(),
		location: faker.location.streetAddress(),
		description: fakeMarkdown(),
		name: fakeName(),
		startAt: DateTime.now().plus({ weeks: 3 }).toJSDate(),
		endAt: DateTime.now().plus({ weeks: 3, hours: 2 }).toJSDate(),
	},
	{
		id: faker.string.uuid(),
		location: faker.location.streetAddress(),
		description: fakeMarkdown(),
		name: fakeName(),
		startAt: DateTime.now().plus({ year: 1 }).toJSDate(),
		endAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
	},
	{
		id: faker.string.uuid(),
		location: faker.location.streetAddress(),
		description: fakeMarkdown(),
		name: fakeName(),
		startAt: DateTime.now().plus({ year: 1 }).toJSDate(),
		endAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
	},
	{
		id: faker.string.uuid(),
		location: faker.location.streetAddress(),
		description: fakeMarkdown(),
		name: fakeName(),
		startAt: DateTime.now().plus({ year: 1 }).toJSDate(),
		endAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
	},
	{
		id: faker.string.uuid(),
		location: faker.location.streetAddress(),
		description: fakeMarkdown(),
		name: fakeName(),
		startAt: DateTime.now().plus({ year: 1 }).toJSDate(),
		endAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
	},
	{
		id: faker.string.uuid(),
		location: faker.location.streetAddress(),
		name: fakeName(),
		startAt: DateTime.now().plus({ year: 1 }).toJSDate(),
		endAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
		capacity: 10,
		remainingCapacity: 10,
		description: fakeMarkdown(),
		signUpsEnabled: true,
		signUpsStartAt: DateTime.now().minus({ day: 1 }).toJSDate(),
		signUpsEndAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
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
		id: faker.string.uuid(),
		name: fakeName(),
		location: faker.location.streetAddress(),
		startAt: DateTime.now().plus({ year: 1 }).toJSDate(),
		endAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
		capacity: 10,
		remainingCapacity: 0,
		description: fakeMarkdown(),
		signUpsEnabled: true,
		signUpsStartAt: DateTime.now().minus({ day: 1 }).toJSDate(),
		signUpsEndAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
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
		id: faker.string.uuid(),
		name: fakeName(),
		location: faker.location.streetAddress(),
		startAt: DateTime.now().plus({ year: 1 }).toJSDate(),
		endAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
		capacity: 10,
		remainingCapacity: 0,
		description: fakeMarkdown(),
		signUpsEnabled: true,
		signUpsStartAt: DateTime.now().plus({ minutes: 2 }).toJSDate(),
		signUpsEndAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
		slots: {
			createMany: {
				data: [
					{ capacity: 5, remainingCapacity: 5, gradeYears: [1, 2, 3] },
					{ capacity: 5, remainingCapacity: 5, gradeYears: [3, 4, 5] },
				],
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

function fakeMarkdown() {
	const fakeHeader = () =>
		`${"#".repeat(faker.number.int({ min: 1, max: 6 }))} ${toTitleCase(
			faker.lorem.words(3),
		)}`;
	const fakeParagraph = () => faker.lorem.paragraph().split("\n").join("\n\n");
	const fakeList = () => {
		const listItems = faker.lorem.paragraphs(3).split("\n");
		return listItems.map((item) => `* ${item}`).join("\n");
	};
	const fakeCode = () => {
		const code = faker.lorem.paragraphs(3).split("\n");
		return code.map((line) => `    ${line}`).join("\n");
	};
	const fakeQuote = () => {
		const quote = faker.lorem.paragraphs(3).split("\n");
		return quote.map((line) => `> ${line}`).join("\n");
	};
	const fakeLink = () => `[${faker.lorem.words(3)}](${faker.internet.url()})`;
	return `
${fakeHeader()}

${fakeParagraph()}

${fakeList()}

${fakeHeader()}
${fakeCode()}

${fakeQuote()}

${fakeLink()}
  `;
}

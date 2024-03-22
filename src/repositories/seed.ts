import { faker } from "@faker-js/faker";
import { PrismaClient } from "@prisma/client";
import { startCase, toLower } from "lodash-es";
import * as Cabins from "./cabins/seed.js";
import * as Documents from "./documents/seed.js";
import * as Events from "./events/seed.js";
import * as Listings from "./listings/seed.js";
import * as Organizations from "./organizations/seed.js";
import * as Products from "./products/seed.js";
import * as Users from "./users/seed.js";

const db = new PrismaClient();

const main = async () => {
	console.log("Seeding...");
	const users = await Users.load(db);
	console.table(users);

	const organizations = await Organizations.load(db);
	console.table(organizations);

	const events = await Events.load(db);
	console.table(events);

	const listings = await Listings.load(db);
	console.table(listings);

	const { cabins, bookings } = await Cabins.load(db);
	console.table(cabins);
	console.table(bookings);

	const { merchant, products } = await Products.load(db);
	console.table(merchant);
	console.table(products);

	const { documents } = await Documents.load(db);
	console.table(documents);
};

try {
	await main();
} catch (err) {
	console.error(err);
	process.exit(1);
} finally {
	console.log("Finished");
	await db.$disconnect();
}

function fakeMarkdown() {
	const images = [
		"https://source.unsplash.com/3tYZjGSBwbk",
		"https://source.unsplash.com/t7YycgAoVSw",
		"https://source.unsplash.com/lSIxP2H5Dmc",
		"https://source.unsplash.com/2Eewt6DoSRI",
		"https://source.unsplash.com/WqZoyvzViBA",
	];
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
	const fakeImage = () =>
		`![${faker.lorem.words(3)}](${
			images[faker.number.int({ min: 0, max: images.length - 1 })]
		})`;
	return `
${fakeHeader()}

${fakeParagraph()}

${fakeImage()}

${fakeList()}

${fakeHeader()}
${fakeCode()}

${fakeQuote()}

${fakeLink()}
 - `;
}

function toTitleCase(str: string) {
	return startCase(toLower(str));
}

export { fakeMarkdown, toTitleCase };

import { faker } from "@faker-js/faker";
import type { Prisma, PrismaClient } from "@prisma/client";

faker.seed(4913048194);

const documents: Prisma.DocumentCreateInput[] = [
	{
		id: faker.string.uuid(),
		name: faker.word.adjective(),
		description: faker.lorem.sentence(),
		categories: {
			connectOrCreate: [
				{
					create: {
						name: "Budsjett",
					},
					where: {
						name: "Budsjett",
					},
				},
				{
					create: {
						name: "2022",
					},
					where: {
						name: "2022",
					},
				},
			],
		},
		file: {
			connectOrCreate: {
				create: {
					name: "file.pdf",
				},
				where: {
					id: faker.string.uuid(),
				},
			},
		},
	},
	{
		id: faker.string.uuid(),
		name: faker.word.adjective(),
		description: faker.lorem.sentence(),
		categories: {
			connectOrCreate: [
				{
					create: {
						name: "Janus:Script",
					},
					where: {
						name: "Janus:Script",
					},
				},
				{
					create: {
						name: "2024",
					},
					where: {
						name: "2024",
					},
				},
			],
		},
		file: {
			connectOrCreate: {
				create: {
					name: "file.pdf",
				},
				where: {
					id: faker.string.uuid(),
				},
			},
		},
	},
	{
		id: faker.string.uuid(),
		name: faker.word.adjective(),
		description: faker.lorem.sentence(),
		categories: {
			connectOrCreate: [
				{
					create: {
						name: "Vedtekter",
					},
					where: {
						name: "Vedtekter",
					},
				},
				{
					create: {
						name: "2026",
					},
					where: {
						name: "2026",
					},
				},
			],
		},
		file: {
			connectOrCreate: {
				create: {
					name: "file.pdf",
				},
				where: {
					id: faker.string.uuid(),
				},
			},
		},
	},
];

async function load(db: PrismaClient) {
	console.log("Seeding documents...");
	for (const document of documents) {
		await db.document.upsert({
			where: {
				id: document.id,
			},
			update: document,
			create: document,
		});
	}

	const documentsInDb = await db.document.findMany();
	return { documents: documentsInDb };
}

export { load };

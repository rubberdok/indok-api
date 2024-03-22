import { faker } from "@faker-js/faker";
import {
	FeaturePermission,
	type Prisma,
	type PrismaClient,
} from "@prisma/client";
import { fakeMarkdown } from "../seed.js";

faker.seed(42);

const organizationCreateInput: Prisma.OrganizationCreateInput[] = [
	{
		id: faker.string.uuid(),
		name: faker.company.name(),
		description: fakeMarkdown(),
	},
	{
		id: faker.string.uuid(),
		name: faker.company.name(),
		description: fakeMarkdown(),
	},
	{
		id: faker.string.uuid(),
		name: faker.company.name(),
		description: fakeMarkdown(),
	},
	{
		id: faker.string.uuid(),
		name: faker.company.name(),
		description: fakeMarkdown(),
	},
];

export const load = async (db: PrismaClient) => {
	console.log("Seeding organizations");
	for (const organization of organizationCreateInput) {
		await db.organization.upsert({
			where: {
				id: organization.id,
			},
			update: organization,
			create: organization,
		});
	}

	// Load Hyttestyret
	await db.organization.upsert({
		where: {
			name: "Hyttestyret",
		},
		update: {
			featurePermissions: [FeaturePermission.CABIN_ADMIN],
			description: fakeMarkdown(),
		},
		create: {
			name: "Hyttestyret",
			featurePermissions: [FeaturePermission.CABIN_ADMIN],
			description: fakeMarkdown(),
		},
	});

	await db.organization.upsert({
		where: {
			name: "Rubberdøk",
		},
		update: {
			featurePermissions: [FeaturePermission.CABIN_ADMIN],
			description: fakeMarkdown(),
		},
		create: {
			name: "Rubberdøk",
			featurePermissions: [FeaturePermission.CABIN_ADMIN],
			description: fakeMarkdown(),
		},
	});

	const organizations = await db.organization.findMany({
		select: {
			name: true,
			id: true,
			featurePermissions: true,
		},
	});

	return organizations;
};

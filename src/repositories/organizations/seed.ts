import { faker } from "@faker-js/faker";
import {
	FeaturePermission,
	type Prisma,
	type PrismaClient,
} from "@prisma/client";

faker.seed(42);

const organizationCreateInput: Prisma.OrganizationCreateInput[] = [
	{
		id: faker.string.uuid(),
		name: faker.company.name(),
		description: faker.lorem.paragraph(),
	},
	{
		id: faker.string.uuid(),
		name: faker.company.name(),
		description: faker.lorem.paragraph(),
	},
	{
		id: faker.string.uuid(),
		name: faker.company.name(),
		description: faker.lorem.paragraph(),
	},
	{
		id: faker.string.uuid(),
		name: faker.company.name(),
		description: faker.lorem.paragraph(),
	},
];

export const load = async (db: PrismaClient) => {
	console.log("Seeding organizations");
	for (const organization of organizationCreateInput) {
		await db.organization.upsert({
			where: {
				id: organization.id,
			},
			update: {},
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
		},
		create: {
			name: "Hyttestyret",
			featurePermissions: [FeaturePermission.CABIN_ADMIN],
		},
	});

	await db.organization.upsert({
		where: {
			name: "Rubberdøk",
		},
		update: {
			featurePermissions: [FeaturePermission.CABIN_ADMIN],
		},
		create: {
			name: "Rubberdøk",
			featurePermissions: [FeaturePermission.CABIN_ADMIN],
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

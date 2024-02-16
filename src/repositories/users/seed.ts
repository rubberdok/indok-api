import { faker } from "@faker-js/faker";
import {
	FeaturePermission,
	type Prisma,
	type PrismaClient,
} from "@prisma/client";
import dayjs from "dayjs";
import { DateTime } from "luxon";
import type { Role } from "~/domain/organizations.js";

faker.seed(3491049213);

const userData: Prisma.UserCreateInput[] = [
	{
		username: "indok",
		feideId: "indok",
		email: "example@example.org",
		firstName: "Indok",
		lastName: "Student",
		graduationYear: dayjs().add(5, "year").year(),
	},
	{
		username: "rubberdok",
		feideId: "rubberdok",
		email: "rubberdok@example.org",
		firstName: "Rubb",
		lastName: "Er Dok",
		graduationYear: dayjs().add(5, "year").year(),
	},
	makeUserWithMemberships(
		{
			firstName: "Eva",
			lastName: "Student Åsen",
			username: "eva_student",
			email: "eva_student@feide.no",
			feideId: "557669b3-af64-4a55-b97e-57c0836efef6",
			graduationYear: DateTime.now().plus({ year: 4 }).year,
		},
		"ADMIN",
	),
	makeUserWithMemberships(
		{
			firstName: "Asbjørn",
			lastName: "ElevG",
			username: "asbjorn_elevg",
			email: "asbjorn_elevg@feide.no",
			feideId: "af761fdb-71fa-484b-9782-ababdc739559",
			graduationYear: DateTime.now().plus({ year: 3 }).year,
		},
		"MEMBER",
	),
];

function makeUserWithMemberships(
	data: Prisma.UserCreateInput,
	role: Role,
): Prisma.UserCreateInput {
	const organizationId = faker.string.uuid();
	const userId = faker.string.uuid();
	return {
		...data,
		id: userId,
		studyProgram: {
			connectOrCreate: {
				where: {
					externalId: "fc:fs:fs:prg:ntnu.no:MTIØT",
				},
				create: {
					externalId: "fc:fs:fs:prg:ntnu.no:MTIØT",
					name: "Industriell Økonomi og Teknologiledelse",
					featurePermissions: [
						FeaturePermission.ARCHIVE_VIEW_DOCUMENTS,
						FeaturePermission.EVENT_WRITE_SIGN_UPS,
					],
				},
			},
		},
		memberships: {
			connectOrCreate: {
				where: {
					userId_organizationId: {
						userId,
						organizationId,
					},
				},
				create: {
					role,
					organization: {
						connectOrCreate: {
							where: {
								name: "Rubberdøk",
							},
							create: {
								id: organizationId,
								name: "Rubberdøk",
								description: "Rubberdøk er en gjeng som lager gummibåter",
								featurePermissions: [FeaturePermission.CABIN_ADMIN],
							},
						},
					},
				},
			},
		},
	};
}

export const load = async (db: PrismaClient) => {
	console.log("Seeding users");
	for (const user of userData) {
		await db.user.upsert({
			where: {
				feideId: user.feideId,
			},
			update: user,
			create: user,
		});
	}
	return db.user.findMany({
		select: {
			id: true,
			isSuperUser: true,
			firstName: true,
			lastName: true,
			_count: {
				select: {
					memberships: true,
				},
			},
		},
	});
};

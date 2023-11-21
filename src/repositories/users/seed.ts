import { faker } from "@faker-js/faker";
import { Prisma, PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import { DateTime } from "luxon";

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
  makeUserWithMemberships({
    firstName: "Eva",
    lastName: "Student Åsen",
    username: "eva_student",
    email: "email: eva_student@feide.no",
    feideId: "557669b3-af64-4a55-b97e-57c0836efef6",
    graduationYear: DateTime.now().plus({ year: 4 }).year,
  }),
];

function makeUserWithMemberships(data: Prisma.UserCreateInput): Prisma.UserCreateInput {
  const organizationId = faker.string.uuid();
  const userId = faker.string.uuid();
  return {
    ...data,
    id: userId,
    memberships: {
      connectOrCreate: {
        where: {
          userId_organizationId: {
            userId,
            organizationId,
          },
        },
        create: {
          organization: {
            connectOrCreate: {
              where: {
                id: organizationId,
              },
              create: {
                id: organizationId,
                name: "Rubberdøk",
                description: "Rubberdøk er en gjeng som lager gummibåter",
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
      update: {},
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

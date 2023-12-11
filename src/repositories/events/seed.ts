import { faker } from "@faker-js/faker";
import { Prisma, PrismaClient } from "@prisma/client";
import { DateTime } from "luxon";

faker.seed(42);

const fakeName = () => {
  return `${faker.word.adjective()} ${faker.word.noun()} ${faker.word.adverb()}`;
};

const eventCreateInput: Prisma.EventCreateInput[] = [
  {
    id: faker.string.uuid(),
    name: fakeName(),
    startAt: DateTime.now().plus({ week: 1 }).toJSDate(),
    endAt: DateTime.now().plus({ week: 1, hours: 2 }).toJSDate(),
  },
  {
    id: faker.string.uuid(),
    name: fakeName(),
    startAt: DateTime.now().plus({ day: 1 }).toJSDate(),
    endAt: DateTime.now().plus({ day: 1, hours: 2 }).toJSDate(),
  },
  {
    id: faker.string.uuid(),
    name: fakeName(),
    startAt: DateTime.now().plus({ weeks: 2 }).toJSDate(),
    endAt: DateTime.now().plus({ weeks: 2, hours: 2 }).toJSDate(),
  },
  {
    id: faker.string.uuid(),
    name: fakeName(),
    startAt: DateTime.now().plus({ weeks: 3 }).toJSDate(),
    endAt: DateTime.now().plus({ weeks: 3, hours: 2 }).toJSDate(),
  },
  {
    id: faker.string.uuid(),
    name: fakeName(),
    startAt: DateTime.now().plus({ year: 1 }).toJSDate(),
    endAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
  },
  {
    id: faker.string.uuid(),
    name: fakeName(),
    startAt: DateTime.now().plus({ year: 1 }).toJSDate(),
    endAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
  },
  {
    id: faker.string.uuid(),
    name: fakeName(),
    startAt: DateTime.now().plus({ year: 1 }).toJSDate(),
    endAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
  },
  {
    id: faker.string.uuid(),
    name: fakeName(),
    startAt: DateTime.now().plus({ year: 1 }).toJSDate(),
    endAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
  },
  {
    id: faker.string.uuid(),
    name: fakeName(),
    startAt: DateTime.now().plus({ year: 1 }).toJSDate(),
    endAt: DateTime.now().plus({ year: 1, hours: 2 }).toJSDate(),
    capacity: 10,
    remainingCapacity: 10,
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

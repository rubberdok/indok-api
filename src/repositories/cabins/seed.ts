import { faker } from "@faker-js/faker";
import { Prisma, PrismaClient } from "@prisma/client";
import { DateTime } from "luxon";
import { BookingStatus } from "~/domain/cabins.js";

faker.seed(312849038190);

const cabinCreateInput: Prisma.CabinCreateInput[] = [
  {
    id: faker.string.uuid(),
    name: "Oksen",
    capacity: 18,
    internalPrice: 10,
    externalPrice: 20,
  },
  {
    id: faker.string.uuid(),
    name: "Bjørnen",
    capacity: 18,
    internalPrice: 10,
    externalPrice: 20,
  },
];

const bookingCreateInput: Prisma.BookingCreateInput[] = [
  {
    id: faker.string.uuid(),
    startDate: DateTime.now().plus({ weeks: 30 }).toJSDate(),
    endDate: DateTime.now().plus({ weeks: 31 }).toJSDate(),
    status: BookingStatus.PENDING,
    email: faker.internet.exampleEmail(),
    phoneNumber: faker.phone.number(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    cabin: {
      connect: {
        name: "Oksen",
      },
    },
  },
  {
    id: faker.string.uuid(),
    startDate: DateTime.now().plus({ weeks: 30 }).toJSDate(),
    endDate: DateTime.now().plus({ weeks: 31 }).toJSDate(),
    status: BookingStatus.REJECTED,
    email: faker.internet.exampleEmail(),
    phoneNumber: faker.phone.number(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    cabin: {
      connect: {
        name: "Oksen",
      },
    },
  },
  {
    id: faker.string.uuid(),
    startDate: DateTime.now().plus({ weeks: 30 }).toJSDate(),
    endDate: DateTime.now().plus({ weeks: 31 }).toJSDate(),
    status: BookingStatus.REJECTED,
    email: faker.internet.exampleEmail(),
    phoneNumber: faker.phone.number(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    cabin: {
      connect: {
        name: "Oksen",
      },
    },
  },
  {
    id: faker.string.uuid(),
    startDate: DateTime.now().plus({ weeks: 30 }).toJSDate(),
    endDate: DateTime.now().plus({ weeks: 31 }).toJSDate(),
    status: BookingStatus.CANCELLED,
    email: faker.internet.exampleEmail(),
    phoneNumber: faker.phone.number(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    cabin: {
      connect: {
        name: "Oksen",
      },
    },
  },
  {
    id: faker.string.uuid(),
    startDate: DateTime.now().plus({ weeks: 30 }).toJSDate(),
    endDate: DateTime.now().plus({ weeks: 31 }).toJSDate(),
    status: BookingStatus.CONFIRMED,
    email: faker.internet.exampleEmail(),
    phoneNumber: faker.phone.number(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    cabin: {
      connect: {
        name: "Oksen",
      },
    },
  },
];

export const load = async (db: PrismaClient) => {
  console.log("Seeding cabins...");
  for (const cabin of cabinCreateInput) {
    await db.cabin.upsert({
      where: {
        id: cabin.id,
      },
      update: cabin,
      create: cabin,
    });
  }
  const cabins = await db.cabin.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  console.log("Seeding bookings...");
  for (const booking of bookingCreateInput) {
    await db.booking.upsert({
      where: {
        id: booking.id,
      },
      update: booking,
      create: booking,
    });
  }
  const bookings = await db.booking.findMany({
    select: {
      id: true,
      cabinId: true,
      status: true,
      firstName: true,
      lastName: true,
    },
  });

  return { cabins, bookings };
};

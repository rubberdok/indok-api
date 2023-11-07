import { randomUUID } from "crypto";

import { faker } from "@faker-js/faker";
import { jest } from "@jest/globals";
import { Cabin } from "@prisma/client";
import dayjs from "dayjs";

import { Database } from "@/core/index.js";
import { BookingStatus } from "@/domain/cabins.js";
import prisma from "@/lib/prisma.js";
import { CabinRepository } from "@/repositories/cabins/index.js";
import { ICabinRepository } from "@/repositories/cabins/interfaces.js";

const systemTime = dayjs().add(50, "years").toDate();

const cabins: Record<string, Cabin> = {};
const id = randomUUID();

let db: Database;
let cabinRepository: ICabinRepository;

beforeAll(() => {
  db = prisma;
  cabinRepository = new CabinRepository(db);
  jest.useFakeTimers().setSystemTime(systemTime);
});

describe("Overlapping bookings", () => {
  beforeEach(async () => {
    await db.booking.deleteMany({
      where: {
        OR: [
          {
            startDate: {
              gte: dayjs().toDate(),
            },
          },
          {
            endDate: {
              gte: dayjs().toDate(),
            },
          },
        ],
      },
    });

    const cabin = await db.cabin.upsert({
      where: {
        name: "Oksen",
      },
      update: {
        capacity: 18,
        internalPrice: 10,
        externalPrice: 20,
      },
      create: {
        name: "Oksen",
        capacity: 18,
        internalPrice: 10,
        externalPrice: 20,
      },
    });
    cabins["Oksen"] = cabin;

    await db.booking.createMany({
      data: [
        {
          cabinId: cabin.id,
          email: faker.internet.email(),
          phoneNumber: faker.phone.number(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          startDate: dayjs().add(1, "day").toDate(),
          endDate: dayjs().add(2, "day").toDate(),
          status: BookingStatus.CONFIRMED,
        },
        {
          cabinId: cabin.id,
          email: faker.internet.email(),
          phoneNumber: faker.phone.number(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          startDate: dayjs().add(2, "day").toDate(),
          endDate: dayjs().add(3, "day").toDate(),
          status: BookingStatus.CONFIRMED,
        },
        {
          id,
          cabinId: cabin.id,
          email: faker.internet.email(),
          phoneNumber: faker.phone.number(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          startDate: dayjs().add(1, "day").toDate(),
          endDate: dayjs().add(3, "day").toDate(),
        },
      ],
    });
  });

  it("should find overlapping bookings", async () => {
    const bookings = await cabinRepository.getOverlappingBookings({
      bookingId: id,
      startDate: dayjs().add(1, "day").toDate(),
      endDate: dayjs().add(3, "day").toDate(),
      status: BookingStatus.CONFIRMED,
    });

    expect(bookings).toHaveLength(2);
    expect(bookings[0]?.id).not.toBe(id);
    expect(bookings[1]?.id).not.toBe(id);
  });
});

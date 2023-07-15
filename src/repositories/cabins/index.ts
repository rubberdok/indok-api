import { Booking, Cabin, Prisma } from "@prisma/client";

import { Database } from "@/core/index.js";

import { ICabinRepository, OverlappingBookingsData } from "./interfaces.js";

export class CabinRepository implements ICabinRepository {
  constructor(private db: Database) {}

  getBookingById(id: string): Promise<Booking> {
    return this.db.booking.findFirstOrThrow({
      where: {
        id,
      },
    });
  }

  getOverlappingBookings({ bookingId, endDate, startDate, status }: OverlappingBookingsData): Promise<Booking[]> {
    return this.db.booking.findMany({
      where: {
        AND: [
          {
            NOT: {
              id: bookingId,
            },
          },
          {
            status,
          },
          {
            AND: [
              {
                startDate: {
                  lt: endDate,
                },
              },
              {
                endDate: {
                  gt: startDate,
                },
              },
            ],
          },
        ],
      },
    });
  }

  getCabinById(id: string): Promise<Cabin> {
    return this.db.cabin.findFirstOrThrow({
      where: {
        id,
      },
    });
  }

  createBooking(data: Prisma.BookingCreateInput): Promise<Booking> {
    return this.db.booking.create({
      data,
    });
  }
  updateBooking(id: string, data: Prisma.BookingUpdateInput): Promise<Booking> {
    return this.db.booking.update({
      where: {
        id,
      },
      data,
    });
  }
}

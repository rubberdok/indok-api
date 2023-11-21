import { Booking, BookingStatus, Cabin, Prisma, PrismaClient } from "@prisma/client";

import { NotFoundError } from "@/domain/errors.js";

type OverlappingBookingsData = {
  bookingId: string;
  startDate: Date;
  endDate: Date;
  status?: BookingStatus;
};

export class CabinRepository {
  constructor(private db: PrismaClient) {}

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

  createBooking(data: {
    cabinId: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    startDate: Date;
    endDate: Date;
  }): Promise<Booking> {
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

  /**
   * getCabinBookingById returns the cabin that has a booking with the given ID.
   */
  async getCabinByBookingId(bookingId: string): Promise<Cabin> {
    const booking = await this.db.cabin.findFirst({
      where: {
        bookings: {
          some: {
            id: bookingId,
          },
        },
      },
    });

    if (!booking) throw new NotFoundError("No matching booking found");
    return booking;
  }

  /**
   * findManyCabins returns all cabins.
   */
  findManyCabins(): Promise<Cabin[]> {
    return this.db.cabin.findMany();
  }
}

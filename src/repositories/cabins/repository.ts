import {
  Booking,
  BookingContact,
  BookingSemester,
  BookingStatus,
  Cabin,
  Prisma,
  PrismaClient,
  Semester,
} from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";
import { InvalidArgumentError, NotFoundError } from "~/domain/errors.js";
import { prismaKnownErrorCodes } from "~/lib/prisma.js";

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

  /**
   * updateBookingSemester updates the semester of the booking with the given ID.
   */
  async updateBookingSemester(data: {
    semester: Semester;
    startAt?: Date;
    endAt?: Date;
    bookingsEnabled?: boolean;
  }): Promise<BookingSemester> {
    try {
      const bookingSemester = await this.db.bookingSemester.update({
        where: {
          semester: data.semester,
        },
        data: {
          startAt: data.startAt,
          endAt: data.endAt,
          bookingsEnabled: data.bookingsEnabled,
        },
      });

      return bookingSemester;
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === prismaKnownErrorCodes.ERR_NOT_FOUND)
          throw new NotFoundError(`No booking semester for ${data.semester} found, please create one first`);
      }
      throw err;
    }
  }

  /**
   * createBookingSemester creates a new booking semester.
   */
  async createBookingSemester(data: {
    semester: Semester;
    startAt: Date;
    endAt: Date;
    bookingsEnabled?: boolean;
  }): Promise<BookingSemester> {
    try {
      const bookingSemester = await this.db.bookingSemester.create({
        data: {
          semester: data.semester,
          startAt: data.startAt,
          endAt: data.endAt,
          bookingsEnabled: data.bookingsEnabled,
        },
      });
      return bookingSemester;
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === prismaKnownErrorCodes.ERR_UNIQUE_CONSTRAINT_VIOLATION)
          throw new InvalidArgumentError(`A booking semester for ${data.semester} already exists`);
      }
      throw err;
    }
  }

  /**
   * getBookingSemester returns the booking semester for the given semester, or null if it does not exist.
   */
  async getBookingSemester(semester: Semester): Promise<BookingSemester | null> {
    const bookingSemester = await this.db.bookingSemester.findUnique({
      where: {
        semester,
      },
    });

    return bookingSemester;
  }

  /**
   * updateBookingContact updates the contact information of the booking with the given ID.
   * If the booking contact does not already exist, it will be created.
   */
  async updateBookingContact(
    data: Partial<{ name: string; email: string; phoneNumber: string }>,
  ): Promise<Pick<BookingContact, "email" | "name" | "id" | "phoneNumber">> {
    return await this.db.bookingContact.upsert({
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
      },
      where: {
        id: "booking-contact",
      },
      create: {
        id: "booking-contact",
        name: data.name,
        email: data.email,
        phoneNumber: data.phoneNumber,
      },
      update: data,
    });
  }

  /**
   * getBookingContact returns the booking contact information. If it does not exist, blank strings will be returned.
   */
  async getBookingContact(): Promise<Pick<BookingContact, "email" | "id" | "name" | "phoneNumber">> {
    const bookingContact = await this.db.bookingContact.findUnique({
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
      },
      where: {
        id: "booking-contact",
      },
    });

    if (bookingContact === null) {
      return {
        id: "booking-contact",
        name: "",
        email: "",
        phoneNumber: "",
      };
    }

    return bookingContact;
  }
}

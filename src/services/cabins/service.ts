import { Booking, BookingContact, BookingSemester, Cabin, FeaturePermission, Semester } from "@prisma/client";
import { DateTime } from "luxon";
import { MessageSendingResponse } from "postmark/dist/client/models/index.js";
import { z } from "zod";

import { BookingStatus } from "@/domain/cabins.js";
import { NotFoundError, PermissionDeniedError, ValidationError } from "@/domain/errors.js";
import { EmailContent, TemplateAlias } from "@/lib/postmark.js";

import { bookingSchema } from "./validation.js";

export interface BookingData {
  email: string;
  firstName: string;
  lastName: string;
  startDate: Date;
  endDate: Date;
  phoneNumber: string;
  cabinId: string;
}

export interface CabinRepository {
  getCabinById(id: string): Promise<Cabin>;
  createBooking(data: BookingData): Promise<Booking>;
  updateBooking(id: string, data: Partial<Booking>): Promise<Booking>;
  getBookingById(id: string): Promise<Booking>;
  getOverlappingBookings(data: {
    bookingId: string;
    startDate: Date;
    endDate: Date;
    status: BookingStatus;
  }): Promise<Booking[]>;
  getCabinByBookingId(bookingId: string): Promise<Cabin>;
  findManyCabins(): Promise<Cabin[]>;
  updateBookingSemester(data: {
    semester: Semester;
    startAt?: Date;
    endAt?: Date;
    bookingsEnabled?: boolean;
  }): Promise<BookingSemester>;
  createBookingSemester(data: {
    semester: Semester;
    startAt: Date;
    endAt: Date;
    bookingsEnabled?: boolean;
  }): Promise<BookingSemester>;
  getBookingSemester(semester: Semester): Promise<BookingSemester | null>;
  getBookingContact(): Promise<Pick<BookingContact, "email" | "name" | "phoneNumber" | "id">>;
  updateBookingContact(
    data: Partial<{ name: string | null; phoneNumber: string | null; email?: string | null }>
  ): Promise<Pick<BookingContact, "email" | "name" | "phoneNumber" | "id">>;
}

export interface PermissionService {
  hasFeaturePermission(data: { userId: string; featurePermission: FeaturePermission }): Promise<boolean>;
}

export interface IMailService {
  send(template: EmailContent): Promise<MessageSendingResponse>;
}

export class CabinService {
  constructor(
    private cabinRepository: CabinRepository,
    private mailService: IMailService,
    private permissionService: PermissionService
  ) {}

  async getCabinByBookingId(bookingId: string): Promise<Cabin> {
    return this.cabinRepository.getCabinByBookingId(bookingId);
  }

  async getCabin(id: string): Promise<Cabin> {
    return this.cabinRepository.getCabinById(id);
  }

  private validateBooking(data: BookingData): void {
    bookingSchema.parse(data);
  }

  private sendBookingConfirmation(booking: Booking) {
    return this.mailService.send({
      TemplateAlias: TemplateAlias.CABIN_BOOKING_RECEIPT,
      TemplateModel: {
        firstName: booking.firstName,
        lastName: booking.lastName,
      },
    });
  }

  async newBooking(data: BookingData): Promise<Booking> {
    this.validateBooking(data);
    const booking = await this.cabinRepository.createBooking(data);
    this.sendBookingConfirmation(booking);
    return booking;
  }

  /**
   * updateBookingStatus updates the status of a booking. Requires MEMBER role and CABIN_BOOKING permission.
   *
   * @throws {PermissionDeniedError} if the user does not have permission to update the booking
   * @throws {ValidationError} if the new status is CONFIRMED and the booking overlaps with another booking
   * @param userId - The id of the user performing the update
   * @param id - The id of the booking to update
   * @param status - The new status of the booking
   * @returns The updated booking
   */
  async updateBookingStatus(userId: string, id: string, status: BookingStatus): Promise<Booking> {
    const hasPermission = await this.permissionService.hasFeaturePermission({
      userId,
      featurePermission: FeaturePermission.CABIN_BOOKING,
    });

    if (!hasPermission) throw new PermissionDeniedError("You do not have permission to update this booking.");

    if (status === BookingStatus.CONFIRMED) {
      const booking = await this.cabinRepository.getBookingById(id);
      const overlapping = await this.cabinRepository.getOverlappingBookings({
        bookingId: id,
        startDate: booking.startDate,
        endDate: booking.endDate,
        status,
      });
      if (overlapping.length > 0) {
        throw new ValidationError("bookings cannot overlap");
      }
    }
    return this.cabinRepository.updateBooking(id, { status });
  }

  /**
   * findManyCabins returns all cabins.
   */
  async findManyCabins(): Promise<Cabin[]> {
    return this.cabinRepository.findManyCabins();
  }

  /**
   * updateBookingSemester updates a booking semester. If a booking semester does not already
   * exist for the given semester, a new one will be created, with `startAt` default to the
   * first day of the semester and `endAt` default to the last day of the semester.
   *
   * @requires a membership in an organization with the CABIN_BOOKING feature permission.
   *
   * @param userId - The id of the user performing the update
   * @param data - The new booking semester data
   * @returns The updated booking semester
   */
  async updateBookingSemester(
    userId: string,
    data: { semester: Semester; startAt?: Date | null; endAt?: Date | null; bookingsEnabled?: boolean | null }
  ) {
    const hasPermission = await this.permissionService.hasFeaturePermission({
      userId,
      featurePermission: FeaturePermission.CABIN_BOOKING,
    });

    if (!hasPermission) throw new PermissionDeniedError("You do not have permission to update the booking semester.");

    const schema = z.object({
      semester: z.enum(["SPRING", "AUTUMN"]),
      startAt: z
        .date()
        .nullish()
        .transform((val) => val ?? undefined),
      endAt: z
        .date()
        .nullish()
        .transform((val) => val ?? undefined),
      bookingsEnabled: z
        .boolean()
        .nullish()
        .transform((val) => val ?? undefined),
    });
    try {
      const { semester, startAt, endAt, bookingsEnabled } = schema.parse(data);

      return await this.cabinRepository.updateBookingSemester({
        semester,
        startAt,
        endAt,
        bookingsEnabled,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(err.message);
      }
      if (err instanceof NotFoundError) {
        /**
         * If the booking semester does not exist, create it.
         */
        return this.createBookingSemester(data);
      }
      throw err;
    }
  }

  /**
   * createBookingSemester creates a new booking semester. If `startAt` or `endAt` is not provided, they will default to
   * the first and last day of the semester respectively. If `bookingEnabled` is not provided, it will default to `false`.
   */
  private async createBookingSemester(data: {
    semester: Semester;
    startAt?: Date | null;
    endAt?: Date | null;
    bookingsEnabled?: boolean | null;
  }) {
    try {
      const schema = z.object({
        semester: z.enum(["SPRING", "AUTUMN"]),
        startAt: z
          .date()
          .default(DateTime.fromObject({ month: data.semester === "SPRING" ? 1 : 8, day: 1 }).toJSDate()),
        endAt: z
          .date()
          .default(DateTime.fromObject({ month: data.semester === "SPRING" ? 7 : 12, day: 31 }).toJSDate()),
        bookingsEnabled: z.boolean().default(false),
      });

      const { semester, startAt, endAt, bookingsEnabled } = schema.parse(data);

      return await this.cabinRepository.createBookingSemester({
        semester,
        startAt: startAt,
        endAt: endAt,
        bookingsEnabled,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(err.message);
      }
      throw err;
    }
  }

  /**
   * getBookingSemester returns the booking semester for the given semester, or null if it does not exist.
   */
  async getBookingSemester(semester: Semester): Promise<BookingSemester | null> {
    return this.cabinRepository.getBookingSemester(semester);
  }

  /**
   * updateBookingContact updates the booking contact information.
   *
   * @throws {PermissionDeniedError} if the user does not have permission to update the booking contact
   * @throws {ValidationError} if the new booking contact data is invalid
   * @param userId - The id of the user performing the update
   * @param data - The new booking contact data
   *
   */
  async updateBookingContact(
    userId: string,
    data: Partial<{
      name: string | null;
      email: string | null;
      phoneNumber: string | null;
    }>
  ): Promise<Pick<BookingContact, "email" | "name" | "phoneNumber" | "id">> {
    const hasPermission = await this.permissionService.hasFeaturePermission({
      userId,
      featurePermission: FeaturePermission.CABIN_BOOKING,
    });

    if (!hasPermission) throw new PermissionDeniedError("You do not have permission to update the booking contact.");

    const schema = z.object({
      name: z
        .string()
        .min(1)
        .nullish()
        .transform((val) => val ?? undefined),
      email: z
        .string()
        .email()
        .nullish()
        .transform((val) => val ?? undefined),
      phoneNumber: z
        .string()
        .min(1)
        .nullish()
        .transform((val) => val ?? undefined),
    });

    try {
      const { name, email, phoneNumber } = schema.parse(data);

      return await this.cabinRepository.updateBookingContact({
        name,
        email,
        phoneNumber,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(err.message);
      }
      throw err;
    }
  }

  /**
   * getBookingContact returns the booking contact information.
   */
  async getBookingContact(): Promise<Pick<BookingContact, "email" | "id" | "name" | "phoneNumber">> {
    return await this.cabinRepository.getBookingContact();
  }
}

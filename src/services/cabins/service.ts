import { Booking, Cabin } from "@prisma/client";

import { ValidationError } from "@/domain/errors.js";
import { BookingStatus } from "@/domain/cabins.js";
import { IMailService, TemplateAliasEnum } from "@/services/mail/interfaces.js";

import { BookingData, ICabinService } from "./interfaces.js";
import { bookingSchema } from "./validation.js";

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
}

export class CabinService implements ICabinService {
  constructor(
    private cabinRepository: CabinRepository,
    private mailService: IMailService
  ) {}

  getCabin(id: string): Promise<Cabin> {
    return this.cabinRepository.getCabinById(id);
  }

  private validateBooking(data: BookingData): void {
    bookingSchema.parse(data);
  }

  private sendBookingConfirmation(booking: Booking) {
    return this.mailService.send({
      TemplateAlias: TemplateAliasEnum.CABIN_BOOKING_RECEIPT,
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

  async updateBookingStatus(id: string, status: BookingStatus): Promise<Booking> {
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
}

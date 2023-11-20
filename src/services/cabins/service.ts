import { Booking, Cabin } from "@prisma/client";
import { MessageSendingResponse } from "postmark/dist/client/models/index.js";

import { BookingStatus } from "@/domain/cabins.js";
import { ValidationError } from "@/domain/errors.js";
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
}

export interface IMailService {
  send(template: EmailContent): Promise<MessageSendingResponse>;
}

export class CabinService {
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

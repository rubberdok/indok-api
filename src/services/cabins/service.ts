import { Booking, Cabin, FeaturePermission } from "@prisma/client";
import { MessageSendingResponse } from "postmark/dist/client/models/index.js";

import { BookingStatus } from "@/domain/cabins.js";
import { PermissionDeniedError, ValidationError } from "@/domain/errors.js";
import { Role } from "@/domain/organizations.js";
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
}

export interface PermissionService {
  hasRole(data: {
    userId: string;
    organizationId: string;
    role: Role;
    featurePermission: FeaturePermission;
  }): Promise<boolean>;
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
    const cabin = await this.cabinRepository.getCabinByBookingId(id);

    const hasRole = await this.permissionService.hasRole({
      userId,
      organizationId: cabin.organizationId,
      role: Role.MEMBER,
      featurePermission: FeaturePermission.CABIN_BOOKING,
    });

    if (!hasRole) throw new PermissionDeniedError("You do not have permission to update this booking.");

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
}

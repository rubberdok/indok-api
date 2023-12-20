export const BookingStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  REJECTED: "REJECTED",
} as const;

export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

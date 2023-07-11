import { BookingData } from "@/services/cabins/interfaces.js";
import { CabinBookingReceipt } from "@/services/mail/interfaces.js";

export interface NegativeValidationTestCase {
  name: string;
  input: BookingData;
  expectedError: string;
}

export interface PositiveValidationTestCase {
  name: string;
  input: BookingData;
  expectedConfirmationEmail: CabinBookingReceipt;
}

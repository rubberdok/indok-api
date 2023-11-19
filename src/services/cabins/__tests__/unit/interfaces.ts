import { CabinBookingReceipt } from "@/services/mail/interfaces.js";

import { BookingData } from "../../service.js";

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

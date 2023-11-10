import { randomUUID } from "crypto";

import dayjs from "dayjs";
import { DeepMockProxy, mockDeep } from "jest-mock-extended";

import { BookingStatus } from "@/domain/cabins.js";
import { BookingData } from "@/services/cabins/interfaces.js";
import { ICabinService, IMailService } from "@/services/index.js";
import { TemplateAliasEnum } from "@/services/mail/interfaces.js";

import { CabinRepository, CabinService } from "../../service.js";

import { NegativeValidationTestCase, PositiveValidationTestCase } from "./interfaces.js";

const validBooking: BookingData = {
  cabinId: randomUUID(),
  startDate: dayjs().add(1, "day").toDate(),
  endDate: dayjs().add(2, "day").toDate(),
  phoneNumber: "40000000",
  email: "exapmle@example.com",
  firstName: "test",
  lastName: "test",
};

let repo: DeepMockProxy<CabinRepository>;
let mockMailService: DeepMockProxy<IMailService>;
let cabinService: ICabinService;

beforeAll(() => {
  repo = mockDeep<CabinRepository>();
  mockMailService = mockDeep<IMailService>();
  cabinService = new CabinService(repo, mockMailService);
});

describe("New booking", () => {
  const negativeValidationTestCases: NegativeValidationTestCase[] = [
    {
      name: "should disallow bookings with a start date in the past",
      input: {
        ...validBooking,
        startDate: dayjs().subtract(1, "day").toDate(),
      },
      expectedError: "start date must be in the future",
    },
    {
      name: "should disallow bookings with an end date in the past",
      input: {
        ...validBooking,
        endDate: dayjs().subtract(1, "day").toDate(),
      },
      expectedError: "end date must be in the future",
    },
    {
      name: "should disallow bookings with an end date before the start date",
      input: {
        ...validBooking,
        startDate: dayjs().add(3, "day").toDate(),
        endDate: dayjs().add(2, "day").toDate(),
      },
      expectedError: "end date must be after start date",
    },
    {
      name: "should disallow invalid emails",
      input: {
        ...validBooking,
        email: "example.com",
      },
      expectedError: "invalid email",
    },
    {
      name: "should disallow invalid phone numbers",
      input: {
        ...validBooking,
        phoneNumber: "111",
      },
      expectedError: "invalid phone number",
    },
    {
      name: "should disallow cabin ids",
      input: {
        ...validBooking,
        cabinId: "123",
      },
      expectedError: "invalid cabin id",
    },
  ];

  test.each(negativeValidationTestCases)("$name", async ({ input, expectedError }) => {
    expect(cabinService.newBooking(input)).rejects.toThrow(expectedError);
  });

  const positiveValidationTestCases: PositiveValidationTestCase[] = [
    {
      name: "should send a booking confirmation email",
      input: validBooking,
      expectedConfirmationEmail: {
        firstName: validBooking.firstName,
        lastName: validBooking.lastName,
      },
    },
  ];

  test.each(positiveValidationTestCases)("$name", async ({ input, expectedConfirmationEmail }) => {
    repo.createBooking.mockReturnValueOnce(
      Promise.resolve({
        ...input,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        status: BookingStatus.PENDING,
      })
    );

    await cabinService.newBooking(input);
    expect(repo.createBooking).toHaveBeenCalledWith(input);
    expect(mockMailService.send).toHaveBeenCalledWith({
      TemplateAlias: TemplateAliasEnum.CABIN_BOOKING_RECEIPT,
      TemplateModel: expectedConfirmationEmail,
    });
  });
});

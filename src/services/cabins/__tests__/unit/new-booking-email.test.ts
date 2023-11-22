import { randomUUID } from "crypto";

import { faker } from "@faker-js/faker";
import dayjs from "dayjs";
import { DeepMockProxy, mockDeep } from "jest-mock-extended";

import { BookingStatus } from "@/domain/cabins.js";
import { TemplateAlias } from "@/lib/postmark.js";

import { BookingData, CabinRepository, CabinService, IMailService, PermissionService } from "../../service.js";

const validBooking: BookingData = {
  cabinId: faker.string.uuid(),
  startDate: dayjs().add(1, "day").toDate(),
  endDate: dayjs().add(2, "day").toDate(),
  phoneNumber: "40000000",
  email: "exapmle@example.com",
  firstName: "test",
  lastName: "test",
};

let repo: DeepMockProxy<CabinRepository>;
let mockMailService: DeepMockProxy<IMailService>;
let cabinService: CabinService;
let permissionService: DeepMockProxy<PermissionService>;

beforeAll(() => {
  repo = mockDeep<CabinRepository>();
  mockMailService = mockDeep<IMailService>();
  permissionService = mockDeep<PermissionService>();
  cabinService = new CabinService(repo, mockMailService, permissionService);
});

describe("newBooking", () => {
  interface TestCase {
    name: string;
    input: BookingData;
    expectedConfirmationEmail: {
      firstName: string;
      lastName: string;
    };
  }

  const testCase: TestCase[] = [
    {
      name: "should send a booking confirmation email",
      input: validBooking,
      expectedConfirmationEmail: {
        firstName: validBooking.firstName,
        lastName: validBooking.lastName,
      },
    },
  ];

  test.each(testCase)("$name", async ({ input, expectedConfirmationEmail }) => {
    repo.createBooking.mockReturnValueOnce(
      Promise.resolve({
        ...input,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        status: BookingStatus.PENDING,
        cabinId: faker.string.uuid(),
      })
    );

    await cabinService.newBooking(input);
    expect(repo.createBooking).toHaveBeenCalledWith(input);
    expect(mockMailService.send).toHaveBeenCalledWith({
      TemplateAlias: TemplateAlias.CABIN_BOOKING_RECEIPT,
      TemplateModel: expectedConfirmationEmail,
    });
  });
});

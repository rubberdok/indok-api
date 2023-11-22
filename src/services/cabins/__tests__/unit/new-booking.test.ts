import { faker } from "@faker-js/faker";
import { Booking, BookingSemester, Semester } from "@prisma/client";
import { DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import { merge } from "lodash-es";
import { DateTime } from "luxon";
import { MessageSendingResponse } from "postmark/dist/client/models/index.js";

import { InvalidArgumentError } from "@/domain/errors.js";

import { BookingData, CabinRepository, CabinService, IMailService, PermissionService } from "../../service.js";

describe("CabinService", () => {
  let cabinService: CabinService;
  let cabinRepository: DeepMockProxy<CabinRepository>;
  let mailService: DeepMockProxy<IMailService>;

  beforeAll(() => {
    cabinRepository = mockDeep<CabinRepository>();
    mailService = mockDeep<IMailService>();
    cabinService = new CabinService(cabinRepository, mailService, mockDeep<PermissionService>());
  });

  describe("newBooking", () => {
    describe("should raise InvalidArgumentError if", () => {
      interface TestCase {
        name: string;
        arrange: {
          bookingSemesters: {
            autumn: BookingSemester | null;
            spring: BookingSemester | null;
          };
        };
        act: {
          input: BookingData;
        };
        expected: {
          error: string;
        };
      }

      async function testFn({ arrange, act, expected }: TestCase) {
        /**
         * Arrange
         *
         * Mock the cabinRepository.getBookingSemesters method to return the bookingSemesters from the test case.
         */
        cabinRepository.getBookingSemester.mockImplementation(async (semester: Semester) => {
          if (semester === Semester.AUTUMN) return arrange.bookingSemesters.autumn;
          if (semester === Semester.SPRING) return arrange.bookingSemesters.spring;
          throw new Error(`Unexpected semester: ${semester}`);
        });

        /**
         * Act
         *
         * Call newBooking with the input from the test case.
         */
        const newBooking = cabinService.newBooking(act.input);

        /**
         * Assert
         *
         * Expect newBooking to throw a InvalidArgumentError with the expected error message.
         */
        await expect(newBooking).rejects.toThrow(InvalidArgumentError);
        await expect(newBooking).rejects.toThrow(expected.error);
        expect(cabinRepository.createBooking).not.toHaveBeenCalled();
      }

      describe("contact details are incorrect", () => {
        const testCases: TestCase[] = [
          {
            name: "email is invalid",
            arrange: {
              bookingSemesters: {
                autumn: makeBookingSemester(),
                spring: makeBookingSemester(),
              },
            },
            act: {
              input: makeCabinInput({
                email: "fake",
              }),
            },
            expected: {
              error: "invalid email",
            },
          },
          {
            name: "phone number is invalid",
            arrange: {
              bookingSemesters: {
                autumn: makeBookingSemester(),
                spring: makeBookingSemester(),
              },
            },
            act: {
              input: makeCabinInput({
                phoneNumber: "fake",
              }),
            },
            expected: {
              error: "invalid phone",
            },
          },
          {
            name: "cabinId is not a UUID",
            arrange: {
              bookingSemesters: {
                autumn: makeBookingSemester(),
                spring: makeBookingSemester(),
              },
            },
            act: {
              input: makeCabinInput({
                cabinId: "fake",
              }),
            },
            expected: {
              error: "invalid cabin id",
            },
          },
          {
            name: "firstName is blank",
            arrange: {
              bookingSemesters: {
                autumn: makeBookingSemester(),
                spring: makeBookingSemester(),
              },
            },
            act: {
              input: makeCabinInput({
                firstName: "",
              }),
            },
            expected: {
              error: "first name must be at least 1 character",
            },
          },
          {
            name: "lastName is blank",
            arrange: {
              bookingSemesters: {
                autumn: makeBookingSemester(),
                spring: makeBookingSemester(),
              },
            },
            act: {
              input: makeCabinInput({
                lastName: "",
              }),
            },
            expected: {
              error: "last name must be at least 1 character",
            },
          },
        ];

        test.each(testCases)("$name", testFn);
      });

      describe("booking dates are incorrect", () => {
        const testCases: TestCase[] = [
          {
            name: "booking start date is in the past",
            arrange: {
              bookingSemesters: {
                autumn: makeBookingSemester(),
                spring: makeBookingSemester(),
              },
            },
            act: {
              input: makeCabinInput({
                startDate: faker.date.past(),
              }),
            },
            expected: {
              error: "start date must be in the future",
            },
          },
          {
            name: "booking end date is in the past",
            arrange: {
              bookingSemesters: {
                autumn: makeBookingSemester(),
                spring: makeBookingSemester(),
              },
            },
            act: {
              input: makeCabinInput({
                endDate: faker.date.past(),
              }),
            },
            expected: {
              error: "end date must be in the future",
            },
          },
          {
            name: "booking end date is before booking start date",
            arrange: {
              bookingSemesters: {
                autumn: makeBookingSemester(),
                spring: makeBookingSemester(),
              },
            },
            act: {
              input: makeCabinInput({
                startDate: DateTime.now().plus({ days: 3 }).toJSDate(),
                endDate: DateTime.now().plus({ days: 2 }).toJSDate(),
              }),
            },
            expected: {
              error: "end date must be after start date",
            },
          },
          {
            name: "booking end date is the same as booking start date",
            arrange: {
              bookingSemesters: {
                autumn: makeBookingSemester(),
                spring: makeBookingSemester(),
              },
            },
            act: {
              input: makeCabinInput({
                startDate: DateTime.now().plus({ days: 2 }).startOf("day").toJSDate(),
                endDate: DateTime.now().plus({ days: 2 }).startOf("day").toJSDate(),
              }),
            },
            expected: {
              error: "end date must be after start date",
            },
          },
        ];

        test.each(testCases)("$name", testFn);
      });

      describe("booking within a booking semester and", () => {
        const testCases: TestCase[] = [
          {
            name: "no booking semesters are active",
            arrange: {
              bookingSemesters: {
                autumn: makeBookingSemester({ bookingsEnabled: false }),
                spring: makeBookingSemester({ bookingsEnabled: false }),
              },
            },
            act: {
              input: makeCabinInput(),
            },
            expected: {
              error: "Bookings are not enabled.",
            },
          },
          {
            name: "no booking semesters exist",
            arrange: {
              bookingSemesters: {
                autumn: null,
                spring: null,
              },
            },
            act: {
              input: makeCabinInput(),
            },
            expected: {
              error: "Bookings are not enabled.",
            },
          },
          {
            name: "the booking start date is before the active booking semester start date",
            arrange: {
              bookingSemesters: {
                autumn: makeBookingSemester({ startAt: DateTime.now().plus({ days: 2 }).toJSDate() }),
                spring: null,
              },
            },
            act: {
              input: makeCabinInput({ startDate: DateTime.now().plus({ days: 1 }).toJSDate() }),
            },
            expected: {
              error: "booking is not in an active booking semester, and is not a valid cross-semester booking",
            },
          },
          {
            name: "the booking end date is after the active booking semester end date",
            arrange: {
              bookingSemesters: {
                autumn: makeBookingSemester({ endAt: DateTime.now().plus({ days: 2 }).toJSDate() }),
                spring: null,
              },
            },
            act: {
              input: makeCabinInput({ endDate: DateTime.now().plus({ days: 3 }).toJSDate() }),
            },
            expected: {
              error: "booking is not in an active booking semester, and is not a valid cross-semester booking",
            },
          },
          {
            name: "the booking is contained in a booking semester that is not active",
            arrange: {
              bookingSemesters: {
                autumn: makeBookingSemester({ bookingsEnabled: false }),
                spring: makeBookingSemester({
                  bookingsEnabled: true,
                  startAt: DateTime.fromObject({ year: 0 }).toJSDate(),
                  endAt: DateTime.fromObject({ year: 1 }).toJSDate(),
                }),
              },
            },
            act: {
              input: makeCabinInput({ endDate: DateTime.now().plus({ days: 3 }).toJSDate() }),
            },
            expected: {
              error: "booking is not in an active booking semester, and is not a valid cross-semester booking",
            },
          },
        ];

        test.each(testCases)("$name", testFn);
      });

      describe("cross-semester booking (Autumn to Spring) and", () => {
        const testCases: TestCase[] = [
          {
            name: "there is more than a day between the booking semesters",
            arrange: {
              bookingSemesters: {
                autumn: makeBookingSemester({ endAt: DateTime.now().plus({ days: 1 }).endOf("day").toJSDate() }),
                spring: makeBookingSemester({
                  startAt: DateTime.now().plus({ days: 3 }).startOf("day").toJSDate(),
                }),
              },
            },
            act: {
              input: makeCabinInput({
                startDate: DateTime.now().plus({ hour: 1 }).toJSDate(),
                endDate: DateTime.now().plus({ days: 4 }).toJSDate(),
              }),
            },
            expected: {
              error: "booking is not in an active booking semester, and is not a valid cross-semester booking",
            },
          },
          {
            name: "the spring semester is not active",
            arrange: {
              bookingSemesters: {
                autumn: makeBookingSemester({ endAt: DateTime.now().plus({ days: 1 }).endOf("day").toJSDate() }),
                spring: makeBookingSemester({
                  startAt: DateTime.now().plus({ days: 2 }).startOf("day").toJSDate(),
                  bookingsEnabled: false,
                }),
              },
            },
            act: {
              input: makeCabinInput({
                startDate: DateTime.now().plus({ hour: 1 }).toJSDate(),
                endDate: DateTime.now().plus({ days: 4 }).toJSDate(),
              }),
            },
            expected: {
              error: "booking is not in an active booking semester, and is not a valid cross-semester booking",
            },
          },
          {
            name: "the autumn semester is not active",
            arrange: {
              bookingSemesters: {
                autumn: makeBookingSemester({
                  endAt: DateTime.now().plus({ days: 1 }).endOf("day").toJSDate(),
                  bookingsEnabled: false,
                }),
                spring: makeBookingSemester({
                  startAt: DateTime.now().plus({ days: 2 }).startOf("day").toJSDate(),
                }),
              },
            },
            act: {
              input: makeCabinInput({
                startDate: DateTime.now().plus({ hour: 1 }).toJSDate(),
                endDate: DateTime.now().plus({ days: 4 }).toJSDate(),
              }),
            },
            expected: {
              error: "booking is not in an active booking semester, and is not a valid cross-semester booking",
            },
          },
        ];

        test.each(testCases)("$name", testFn);
      });

      describe("cross-semester booking (Spring to Autumn) and", () => {
        const testCases: TestCase[] = [
          {
            name: "there is more than a day between the booking semesters",
            arrange: {
              bookingSemesters: {
                autumn: makeBookingSemester({
                  startAt: DateTime.now().plus({ days: 3 }).startOf("day").toJSDate(),
                }),
                spring: makeBookingSemester({ endAt: DateTime.now().plus({ days: 1 }).endOf("day").toJSDate() }),
              },
            },
            act: {
              input: makeCabinInput({
                startDate: DateTime.now().plus({ hour: 1 }).toJSDate(),
                endDate: DateTime.now().plus({ days: 4 }).toJSDate(),
              }),
            },
            expected: {
              error: "booking is not in an active booking semester, and is not a valid cross-semester booking",
            },
          },
          {
            name: "the autumn semester is not active",
            arrange: {
              bookingSemesters: {
                autumn: makeBookingSemester({
                  startAt: DateTime.now().plus({ days: 2 }).startOf("day").toJSDate(),
                  bookingsEnabled: false,
                }),
                spring: makeBookingSemester({ endAt: DateTime.now().plus({ days: 1 }).endOf("day").toJSDate() }),
              },
            },
            act: {
              input: makeCabinInput({
                startDate: DateTime.now().plus({ hour: 1 }).toJSDate(),
                endDate: DateTime.now().plus({ days: 4 }).toJSDate(),
              }),
            },
            expected: {
              error: "booking is not in an active booking semester, and is not a valid cross-semester booking",
            },
          },
          {
            name: "the spring semester is not active",
            arrange: {
              bookingSemesters: {
                autumn: makeBookingSemester({
                  startAt: DateTime.now().plus({ days: 2 }).startOf("day").toJSDate(),
                }),
                spring: makeBookingSemester({
                  endAt: DateTime.now().plus({ days: 1 }).endOf("day").toJSDate(),
                  bookingsEnabled: false,
                }),
              },
            },
            act: {
              input: makeCabinInput({
                startDate: DateTime.now().plus({ hour: 1 }).toJSDate(),
                endDate: DateTime.now().plus({ days: 4 }).toJSDate(),
              }),
            },
            expected: {
              error: "booking is not in an active booking semester, and is not a valid cross-semester booking",
            },
          },
        ];

        test.each(testCases)("$name", testFn);
      });
    });

    describe("should create a booking if", () => {
      interface TestCase {
        name: string;
        arrange: {
          bookingSemesters: {
            autumn: BookingSemester | null;
            spring: BookingSemester | null;
          };
        };
        act: {
          input: BookingData;
        };
      }

      async function testFn({ arrange, act }: TestCase) {
        /**
         * Arrange
         *
         * Mock the cabinRepository.getBookingSemesters method to return the bookingSemesters from the test case.
         * Mock the cabinRepository.createBooking method to return a booking.
         * Mock the mailService.sendBookingConfirmation method to return a promise.
         */
        cabinRepository.getBookingSemester.mockImplementation(async (semester: Semester) => {
          if (semester === Semester.AUTUMN) return arrange.bookingSemesters.autumn;
          if (semester === Semester.SPRING) return arrange.bookingSemesters.spring;
          throw new Error(`Unexpected semester: ${semester}`);
        });
        cabinRepository.createBooking.mockResolvedValueOnce(mock<Booking>());
        mailService.send.mockImplementationOnce(() => Promise.resolve(mock<MessageSendingResponse>()));

        /**
         * Act
         *
         * Call newBooking with the input from the test case.
         */
        const newBooking = cabinService.newBooking(act.input);

        /**
         * Assert
         *
         * Expect newBooking not to throw an error
         * Expect cabinRepository.createBooking to be called with the correct arguments
         * Expect mailService.sendBookingConfirmation to be called with the correct arguments
         */
        await expect(newBooking).resolves.not.toThrow();
        expect(cabinRepository.createBooking).toHaveBeenCalled();
      }

      describe("booking within a booking semester and", () => {
        const testCases: TestCase[] = [
          {
            name: "the booking start date is the same as the active booking semester start date",
            arrange: {
              bookingSemesters: {
                autumn: makeBookingSemester({ startAt: DateTime.now().plus({ days: 2 }).startOf("day").toJSDate() }),
                spring: null,
              },
            },
            act: {
              input: makeCabinInput({ startDate: DateTime.now().plus({ days: 2 }).startOf("day").toJSDate() }),
            },
          },
          {
            name: "the booking end date is the same as the active booking semester end date",
            arrange: {
              bookingSemesters: {
                autumn: makeBookingSemester({ endAt: DateTime.now().plus({ days: 2 }).startOf("day").toJSDate() }),
                spring: null,
              },
            },
            act: {
              input: makeCabinInput({
                startDate: DateTime.now().plus({ days: 1 }).startOf("day").toJSDate(),
                endDate: DateTime.now().plus({ days: 2 }).startOf("day").toJSDate(),
              }),
            },
          },
          {
            name: "the booking is contained in a booking semester that is active",
            arrange: {
              bookingSemesters: {
                autumn: makeBookingSemester(),
                spring: null,
              },
            },
            act: {
              input: makeCabinInput({
                startDate: DateTime.now().plus({ days: 1 }).startOf("day").toJSDate(),
                endDate: DateTime.now().plus({ days: 2 }).startOf("day").toJSDate(),
              }),
            },
          },
        ];

        test.each(testCases)("$name", testFn);
      });

      describe("cross-semester booking (Autumn to Spring) and", () => {
        const testCases: TestCase[] = [
          {
            name: "the booking semesters are adjacent",
            arrange: {
              bookingSemesters: {
                autumn: makeBookingSemester({ endAt: DateTime.now().plus({ days: 1 }).startOf("day").toJSDate() }),
                spring: makeBookingSemester({
                  startAt: DateTime.now().plus({ days: 2 }).endOf("day").toJSDate(),
                }),
              },
            },
            act: {
              input: makeCabinInput({
                startDate: DateTime.now().plus({ hour: 1 }).toJSDate(),
                endDate: DateTime.now().plus({ days: 3 }).toJSDate(),
              }),
            },
          },
          {
            name: "the booking semesters overlap",
            arrange: {
              bookingSemesters: {
                autumn: makeBookingSemester({ endAt: DateTime.now().plus({ days: 10 }).startOf("day").toJSDate() }),
                spring: makeBookingSemester({
                  startAt: DateTime.now().plus({ days: 0 }).startOf("day").toJSDate(),
                }),
              },
            },
            act: {
              input: makeCabinInput({
                startDate: DateTime.now().plus({ hour: 1 }).toJSDate(),
                endDate: DateTime.now().plus({ days: 3 }).toJSDate(),
              }),
            },
          },
        ];

        test.each(testCases)("$name", testFn);
      });

      describe("cross-semester booking (Spring to Autumn) and", () => {
        const testCases: TestCase[] = [
          {
            name: "the booking semesters are adjacent",
            arrange: {
              bookingSemesters: {
                autumn: makeBookingSemester({
                  startAt: DateTime.now().plus({ days: 2 }).endOf("day").toJSDate(),
                }),
                spring: makeBookingSemester({ endAt: DateTime.now().plus({ days: 1 }).startOf("day").toJSDate() }),
              },
            },
            act: {
              input: makeCabinInput({
                startDate: DateTime.now().plus({ hour: 1 }).toJSDate(),
                endDate: DateTime.now().plus({ days: 3 }).toJSDate(),
              }),
            },
          },
          {
            name: "the booking semesters overlap",
            arrange: {
              bookingSemesters: {
                autumn: makeBookingSemester({
                  startAt: DateTime.now().plus({ days: 0 }).startOf("day").toJSDate(),
                }),
                spring: makeBookingSemester({ endAt: DateTime.now().plus({ days: 10 }).startOf("day").toJSDate() }),
              },
            },
            act: {
              input: makeCabinInput({
                startDate: DateTime.now().plus({ hour: 1 }).toJSDate(),
                endDate: DateTime.now().plus({ days: 3 }).toJSDate(),
              }),
            },
          },
        ];

        test.each(testCases)("$name", testFn);
      });
    });
  });
});

function makeCabinInput(data: Partial<BookingData> = {}): BookingData {
  const startDate = faker.date.future();
  const endDate = faker.date.future({ refDate: startDate });
  return merge<BookingData, Partial<BookingData>>(
    {
      cabinId: faker.string.uuid(),
      startDate,
      endDate,
      phoneNumber: "40000000",
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    },
    data
  );
}

function makeBookingSemester(data: Partial<BookingSemester> = {}): BookingSemester {
  return merge<BookingSemester, Partial<BookingSemester>>(
    {
      id: faker.string.uuid(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.past(),
      semester: Semester.AUTUMN,
      startAt: DateTime.fromObject({ year: 0 }).toJSDate(),
      endAt: DateTime.fromObject({ year: 3000 }).toJSDate(),
      bookingsEnabled: true,
    },
    data
  );
}

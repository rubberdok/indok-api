import { faker } from "@faker-js/faker";
import { BookingContact, FeaturePermission } from "@prisma/client";
import { DeepMockProxy, mock, mockDeep } from "jest-mock-extended";

import { PermissionDeniedError, InvalidArgumentError } from "@/domain/errors.js";

import { CabinRepository, CabinService, IMailService, PermissionService } from "../../service.js";

describe("CabinService", () => {
  let cabinService: CabinService;
  let cabinRepository: DeepMockProxy<CabinRepository>;
  let permissionService: DeepMockProxy<PermissionService>;
  let mailService: DeepMockProxy<IMailService>;

  beforeAll(() => {
    cabinRepository = mockDeep<CabinRepository>();
    permissionService = mockDeep<PermissionService>();
    mailService = mockDeep<IMailService>();
    cabinService = new CabinService(cabinRepository, mailService, permissionService);
  });

  describe("updateBookingContact", () => {
    it("should throw PermissionDeniedError if user does not have permission to update booking contact", async () => {
      /**
       * Arrange
       *
       * Mock the permissionService.hasFeaturePermission method to return false.
       * Mock the cabinRepository.getCabinByBookingId method to return a cabin.
       */
      const userId = faker.string.uuid();
      permissionService.hasFeaturePermission.mockResolvedValueOnce(false);

      /**
       * Act
       *
       * Call updateBookingContact
       */
      const updateBookingContact = cabinService.updateBookingContact(userId, {
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phoneNumber: "40000000",
      });

      /**
       * Assert
       *
       * Expect updateBookingContact to throw a PermissionDeniedError
       * Expect permissionService.hasFeaturePermission to be called with the correct arguments
       */
      await expect(updateBookingContact).rejects.toThrow(PermissionDeniedError);
      expect(permissionService.hasFeaturePermission).toHaveBeenCalledWith({
        userId: userId,
        featurePermission: FeaturePermission.CABIN_BOOKING,
      });
    });

    it("should update the booking contact with valid arguments", async () => {
      /**
       * Arrange
       *
       * Mock the permissionService.hasFeaturePermission method to return true.
       * Mock the cabinRepository.updateBookingContact method to return a booking contact.
       */
      const userId = faker.string.uuid();
      permissionService.hasFeaturePermission.mockResolvedValueOnce(true);
      cabinRepository.updateBookingContact.mockResolvedValueOnce(mock<BookingContact>());

      /**
       * Act
       *
       * Call updateBookingContact
       */
      const name = faker.person.fullName();
      const email = faker.internet.email();
      const phoneNumber = "4740000000";

      await cabinService.updateBookingContact(userId, {
        name,
        email,
        phoneNumber,
      });

      /**
       * Assert
       *
       * Expect updateBookingContact to have been called with the correct arguments
       */
      expect(cabinRepository.updateBookingContact).toHaveBeenCalledWith({
        name,
        email,
        phoneNumber,
      });
    });

    it("should not pass null values to the repository", async () => {
      /**
       * Arrange
       *
       * Mock the permissionService.hasFeaturePermission method to return true.
       * Mock the cabinRepository.updateBookingContact method to return a booking contact.
       */
      const userId = faker.string.uuid();
      permissionService.hasFeaturePermission.mockResolvedValueOnce(true);
      cabinRepository.updateBookingContact.mockResolvedValueOnce(mock<BookingContact>());

      /**
       * Act
       *
       * Call updateBookingContact
       */
      await cabinService.updateBookingContact(userId, {
        name: null,
        email: null,
        phoneNumber: null,
      });

      /**
       * Assert
       *
       * Expect updateBookingContact to have been called with the correct arguments
       */
      expect(cabinRepository.updateBookingContact).toHaveBeenCalledWith({
        name: undefined,
        email: undefined,
        phoneNumber: undefined,
      });
    });

    it("should raise InvalidArgumentError if the booking contact is invalid", async () => {
      /**
       * Arrange
       *
       * Mock the permissionService.hasFeaturePermission method to return true.
       * Mock the cabinRepository.updateBookingContact method to return a booking contact.
       */
      const userId = faker.string.uuid();
      permissionService.hasFeaturePermission.mockResolvedValueOnce(true);
      cabinRepository.updateBookingContact.mockResolvedValueOnce(mock<BookingContact>());

      /**
       * Act
       *
       * Call updateBookingContact
       */
      const updateBookingContact = cabinService.updateBookingContact(userId, {
        email: "",
        phoneNumber: "",
      });

      /**
       * Assert
       *
       * Expect updateBookingContact to throw a InvalidArgumentError
       */
      await expect(updateBookingContact).rejects.toThrow(InvalidArgumentError);
    });
  });

  describe("getBookingContact", () => {
    it("should call repository.getBookingContact and not raise PermissionDeniedError", async () => {
      /**
       * Arrange
       *
       * Mock the cabinRepository.getBookingContact method to return a booking contact.
       */
      permissionService.hasFeaturePermission.mockResolvedValueOnce(false);
      cabinRepository.getBookingContact.mockResolvedValueOnce(mock<BookingContact>());

      /**
       * Act
       *
       * Call getBookingContact
       */
      await cabinService.getBookingContact();

      /**
       * Assert
       *
       * Expect getBookingContact to have been called
       */
      expect(cabinRepository.getBookingContact).toHaveBeenCalled();
    });
  });
});
